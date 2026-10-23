import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { generateKeyPair, SignJWT } from 'jose';
import { createHandler } from '../src/index.mjs';
import { validate, githubClient } from '../src/data.mjs';

const { publicKey, privateKey } = await generateKeyPair('RS256');
const domain = 'https://test-team.cloudflareaccess.com';
const email = 'owner@example.test';
const env = { ACCESS_TEAM_DOMAIN: domain, ACCESS_AUD: 'test-audience', ADMIN_EMAIL: email, GITHUB_TOKEN: 'test-secret',
  ASSETS: { fetch() { return new Response('<h1>Private admin</h1>', { headers: { 'Content-Type': 'text/html' } }); } } };
async function token(overrides = {}, signingKey = privateKey) {
  return new SignJWT({ email, type: 'app', ...overrides }).setProtectedHeader({ alg: 'RS256', kid: 'key' })
    .setIssuer(domain).setAudience('test-audience').setSubject('owner-id').setIssuedAt().setExpirationTime('1h').sign(signingKey);
}
const handler = createHandler({ resolveKeys: publicKey, fetcher: () => { throw new Error('Unexpected external request'); } });
function request(path = '/', jwt, options = {}) {
  return new Request('https://admin.example.test' + path, { ...options, headers: {
    ...(jwt ? { 'Cf-Access-Jwt-Assertion': jwt } : {}), ...options.headers,
  } });
}

test('missing configuration denies every route before serving assets or contacting GitHub', async () => {
  for (const path of ['/', '/app.js', '/style.css', '/api/files/aliases', '/api/refresh']) {
    const response = await handler(request(path), {});
    assert.equal(response.status, 503); assert.equal((await response.json()).error, 'auth-not-configured');
  }
});
test('a spoofed email header cannot enter the admin or read an API', async () => {
  for (const path of ['/', '/app.js', '/api/session']) {
    const response = await handler(request(path, undefined, { headers: { 'Cf-Access-Authenticated-User-Email': email } }), env);
    assert.equal(response.status, 401);
  }
});
test('only a signed, unexpired app token for this application and owner is accepted', async () => {
  const jwt = await token();
  const response = await handler(request('/api/session', jwt), env);
  assert.equal(response.status, 200); assert.equal((await response.json()).email, email);
  for (const [key, value] of [['ACCESS_AUD', 'other-app'], ['ACCESS_TEAM_DOMAIN', 'https://other.cloudflareaccess.com'], ['ADMIN_EMAIL', 'other@example.test']]) {
    assert.ok([401, 403].includes((await handler(request('/', jwt), { ...env, [key]: value })).status));
  }
  for (const payload of [{ email: 'intruder@example.test' }, { type: 'service' }]) {
    assert.equal((await handler(request('/', await token(payload)), env)).status, 403);
  }
  const expired = await new SignJWT({ email, type: 'app' }).setProtectedHeader({ alg: 'RS256' }).setIssuer(domain)
    .setAudience('test-audience').setSubject('owner-id').setIssuedAt().setExpirationTime(Math.floor(Date.now() / 1000) - 60).sign(privateKey);
  assert.equal((await handler(request('/', expired), env)).status, 401);
  const otherKey = await generateKeyPair('RS256');
  assert.equal((await handler(request('/', await token({}, otherKey.privateKey)), env)).status, 401);
});
test('authenticated assets are not cacheable, embeddable or script-injectable', async () => {
  const response = await handler(request('/', await token()), env);
  assert.equal(response.status, 200); assert.match(await response.text(), /Private admin/);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.doesNotMatch(response.headers.get('content-security-policy'), /unsafe-inline|unsafe-eval/);
  assert.equal(response.headers.get('access-control-allow-origin'), null);
});
test('cross-origin and simple-form writes are rejected even with a valid Access token', async () => {
  const jwt = await token();
  for (const headers of [{}, { Origin: 'https://attacker.example', 'Content-Type': 'application/json', 'X-Admin-Request': '1' },
    { Origin: 'https://admin.example.test', 'Content-Type': 'text/plain', 'X-Admin-Request': '1' }]) {
    const response = await handler(request('/api/save', jwt, { method: 'POST', headers, body: '{}' }), env);
    assert.equal(response.status, 403);
  }
});
test('the API cannot write arbitrary paths and enforces a streaming body size limit', async () => {
  const jwt = await token();
  const headers = { Origin: 'https://admin.example.test', 'Content-Type': 'application/json', 'X-Admin-Request': '1' };
  const response = await handler(request('/api/save', jwt, { method: 'POST', headers,
    body: JSON.stringify({ changes: [{ key: 'operators', sha: 'a'.repeat(40), doc: {} }] }) }), env);
  assert.equal(response.status, 403);
  const tooLarge = await handler(request('/api/save', jwt, { method: 'POST', headers, body: ' '.repeat(1024 * 1024 + 1) }), env);
  assert.equal(tooLarge.status, 413);
});
test('current site documents validate; unsafe URLs, duplicate flags, and invalid aliases fail', async () => {
  for (const [key, file] of [['future', 'future-names'], ['aliases', 'operator-aliases'], ['images', 'item-images']]) {
    const doc = JSON.parse(await readFile(new URL('../../../data/' + file + '.json', import.meta.url)));
    assert.equal(validate(key, doc), doc);
  }
  for (const url of ['javascript:alert(1)', 'data:image/svg+xml,abc', 'http://example.com/a.png', 'https://user:pass@example.com/a', 'assets/../private.png']) {
    assert.throws(() => validate('images', { items: { '1': { name: 'item', url } } }), /invalid-data/);
  }
  assert.throws(() => validate('aliases', { aliases: { name: 'not-an-array' } }), /invalid-data/);
  assert.throws(() => validate('future', { nameSource: 'source', operators: {}, professions: {}, items: {}, releasedOperators: ['char_1_a', 'char_1_a'] }), /invalid-data/);
});
test('file revision conflicts never update the branch', async () => {
  const calls = [];
  const gh = githubClient(env, async (url, options) => {
    calls.push([url, options.method || 'GET']);
    if (url.endsWith('/git/ref/heads/main')) return Response.json({ object: { sha: 'h'.repeat(40) } });
    if (url.includes('/git/commits/')) return Response.json({ tree: { sha: 't'.repeat(40) } });
    return Response.json({ sha: 'b'.repeat(40), encoding: 'base64', content: btoa('{"aliases":{}}') });
  });
  await assert.rejects(gh.save([{ key: 'aliases', sha: 'a'.repeat(40), doc: { aliases: { Name: ['Alias'] } } }]), /conflict/);
  assert.ok(calls.every(([, method]) => method === 'GET'));
});
for (const race of [false, true]) test('atomic multi-file save ' + (race ? 'rejects a branch race' : 'publishes once with matching revisions'), async () => {
  const calls = [], revision = 'a'.repeat(40);
  const next = { aliases: { Name: ['별칭'] } }, original = { aliases: {} };
  const gh = githubClient(env, async (url, options) => {
    calls.push({ url, method: options.method || 'GET', body: options.body && JSON.parse(options.body) });
    if (url.endsWith('/git/ref/heads/main')) return Response.json({ object: { sha: 'parent' } });
    if (url.endsWith('/git/commits/parent')) return Response.json({ tree: { sha: 'tree' } });
    if (url.includes('/contents/')) return Response.json({ sha: revision, encoding: 'base64', content: btoa(JSON.stringify(url.includes('item-images') ? { items: {} } : original)) });
    if (url.endsWith('/git/refs/heads/main')) return race ? Response.json({ message: 'Reference update failed' }, { status: 422 }) : Response.json({ object: { sha: 'next' } });
    return Response.json({ sha: 'next' });
  });
  const saving = gh.save([{ key: 'aliases', sha: revision, doc: next },
    { key: 'images', sha: revision, doc: { items: { '1': { name: 'item', url: 'https://example.test/item.png' } } } }]);
  if (race) await assert.rejects(saving, /conflict/);
  else {
    const result = await saving;
    assert.equal(result.changed, true); assert.equal(result.commit, 'next');
    assert.deepEqual(result.revisions, { aliases: 'next', images: 'next' });
  }
  const updates = calls.filter(x => x.method === 'PATCH'); assert.equal(updates.length, 1);
  assert.deepEqual(updates[0].body, { sha: 'next', force: false });
  assert.equal(calls.find(x => x.url.endsWith('/git/trees')).body.tree.length, 2);
  assert.match(calls.find(x => x.url.endsWith('/git/blobs')).body.content, /별칭/);
});
