import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validate, githubClient } from '../src/data.mjs';
const env = { GITHUB_TOKEN: 'test-secret' };
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
