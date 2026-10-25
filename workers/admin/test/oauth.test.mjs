import test from 'node:test';
import assert from 'node:assert/strict';
import { SignJWT } from 'jose';
import { createHandler } from '../src/index.mjs';
const origin = 'https://admin.example.test';
const env = { ADMIN_ORIGIN: origin, ADMIN_GITHUB_ID: '123', GITHUB_CLIENT_ID: 'test-client',
  GITHUB_CLIENT_SECRET: 'test-only-secret-with-at-least-32-characters', GITHUB_TOKEN: 'repo-write-secret',
  ASSETS: { fetch(request) { return new Response(new URL(request.url).pathname === '/login.html' ? 'GitHub login' : 'Private admin'); } } };
function request(path = '/', cookie, options = {}) {
  return new Request(origin + path, { ...options, headers: { ...(cookie ? { Cookie: cookie } : {}), ...options.headers } });
}
function handlerFor(user = { id: 123, login: 'owner' }, calls = []) {
  return createHandler({ fetcher: async (url, options) => {
    calls.push({url, options});
    if (url === 'https://github.com/login/oauth/access_token') return Response.json({ access_token: 'oauth-identity-only' });
    if (url === 'https://api.github.com/user') return Response.json(user);
    throw new Error('Unexpected external request');
  } });
}
const handler = handlerFor();
async function login(h = handler) {
  const start = await h(request('/auth/start'), env);
  const auth = new URL(start.headers.get('location'));
  const cookie = start.headers.get('set-cookie').split(';')[0];
  const callback = await h(request('/auth/callback?code=test-code&state=' + auth.searchParams.get('state'), cookie), env);
  return { start, auth, cookie, callback, session: callback.headers.getSetCookie().find(x => x.startsWith('__Host-admin_session='))?.split(';')[0] };
}
test('missing OAuth configuration denies private assets and APIs', async () => {
  for (const path of ['/', '/app.js', '/style.css', '/api/session', '/auth/start']) assert.equal((await handler(request(path), {})).status, 503);
});
test('public login cannot expose private assets or accept spoofed identity headers', async () => {
  assert.equal((await handler(request('/login'), env)).status, 200);
  assert.equal((await handler(request('/'), env)).headers.get('location'), '/login');
  for (const path of ['/api/session', '/app.js']) assert.equal((await handler(request(path, null, { headers: { 'Cf-Access-Authenticated-User-Email': 'owner@example.test' } }), env)).status, 401);
});
test('login uses the canonical asset URL instead of redirecting back to itself', async () => {
  const canonicalAssets = { fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === '/login.html') return new Response(null, { status: 307, headers: { Location: '/login' } });
    assert.equal(path, '/login');
    return new Response('GitHub login', { headers: { 'Content-Type': 'text/html' } });
  } };
  const response = await handler(request('/login'), { ...env, ASSETS: canonicalAssets });
  assert.equal(response.status, 200); assert.equal(response.headers.get('location'), null);
  assert.equal(await response.text(), 'GitHub login');
});
test('OAuth uses PKCE, random state and a secure cookie without requesting repository scopes', async () => {
  const one = await handler(request('/auth/start'), env), two = await handler(request('/auth/start'), env);
  const a = new URL(one.headers.get('location')), b = new URL(two.headers.get('location'));
  assert.equal(a.origin, 'https://github.com'); assert.equal(a.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(a.searchParams.get('code_challenge').length, 43); assert.equal(a.searchParams.get('scope'), '');
  assert.notEqual(a.searchParams.get('state'), b.searchParams.get('state'));
  assert.equal(a.searchParams.get('redirect_uri'), origin + '/auth/callback');
  assert.match(one.headers.get('set-cookie'), /HttpOnly; Secure; SameSite=Lax/);
});
test('missing or mismatched OAuth state cannot exchange an authorization code', async () => {
  const calls = [], h = handlerFor(undefined, calls), result = await login(h); calls.length = 0;
  for (const cookie of [null, result.cookie]) {
    const response = await h(request('/auth/callback?code=code&state=wrong', cookie), env);
    assert.equal(response.status, 403); assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
  }
  assert.equal(calls.length, 0);
});
test('only the configured numeric GitHub ID receives a session; tokens stay off the browser', async () => {
  const calls = [], success = await login(handlerFor({ id: 123, login: 'renamed-owner' }, calls));
  assert.equal(success.callback.status, 302); assert.ok(success.session);
  const session = await handler(request('/api/session', success.session), env);
  assert.deepEqual(await session.json(), { ok: true, login: 'renamed-owner' });
  const exchange = JSON.parse(calls[0].options.body);
  assert.equal(exchange.code_verifier.length, 43); assert.equal(exchange.redirect_uri, origin + '/auth/callback');
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(exchange.code_verifier)));
  const challenge = btoa(String.fromCharCode(...digest)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  assert.equal(challenge, success.auth.searchParams.get('code_challenge'));
  assert.equal(calls[1].options.headers.Authorization, 'Bearer oauth-identity-only');
  const payload = JSON.parse(atob(success.session.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
  assert.deepEqual(Object.keys(payload).sort(), ['aud','exp','iat','iss','login','sub']);
  const wrong = await login(handlerFor({ id: 999, login: 'owner' }));
  assert.equal(wrong.callback.status, 403); assert.equal(wrong.session, undefined);
});
test('expired, wrong-purpose, other-owner, forged and wrong-origin sessions fail', async () => {
  const key = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(env.GITHUB_CLIENT_SECRET + ':session')));
  for (const [sub, aud, exp] of [['999', 'admin-session', '1h'], ['123', 'admin-flow', '1h'], ['123', 'admin-session', -60]]) {
    const signed = await new SignJWT({ sub, login: 'owner' }).setProtectedHeader({ alg: 'HS256' }).setIssuer(origin)
      .setAudience(aud).setIssuedAt().setExpirationTime(typeof exp === 'number' ? Math.floor(Date.now()/1000)+exp : exp).sign(key);
    assert.ok([401,403].includes((await handler(request('/api/session', '__Host-admin_session=' + signed), env)).status));
  }
  assert.equal((await handler(request('/api/session', '__Host-admin_session=forged'), env)).status, 401);
  const { session } = await login();
  assert.equal((await handler(new Request('https://other.example.test/api/session', {headers:{Cookie:session}}), env)).status, 403);
});
test('authenticated assets keep no-store, framing and script protections', async () => {
  const { session } = await login(), response = await handler(request('/', session), env);
  assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.doesNotMatch(response.headers.get('content-security-policy'), /unsafe-inline|unsafe-eval/);
});
test('cross-origin writes and oversized requests fail; same-origin logout clears both cookies', async () => {
  const { session } = await login();
  for (const headers of [{}, {Origin:'https://attacker.example', 'Content-Type':'application/json','X-Admin-Request':'1'},
    {Origin:origin,'Content-Type':'text/plain','X-Admin-Request':'1'}]) assert.equal((await handler(request('/api/save',session,{method:'POST',headers,body:'{}'}),env)).status,403);
  const headers = {Origin:origin,'Content-Type':'application/json','X-Admin-Request':'1'};
  assert.equal((await handler(request('/api/save',session,{method:'POST',headers,body:' '.repeat(1024*1024+1)}),env)).status,413);
  const out = await handler(request('/auth/logout',session,{method:'POST',headers,body:'{}'}),env);
  assert.equal(out.status,200); assert.equal(out.headers.getSetCookie().length,2); assert.match(out.headers.get('set-cookie'),/Max-Age=0/);
});
test('raw account endpoints require the owner session, same-origin JSON, valid input and rate limiting', async () => {
  const headers = { Origin: origin, 'Content-Type': 'application/json', 'X-Admin-Request': '1' };
  const body = JSON.stringify({ server: 'kr', email: 'test@example.kr', code: '123456' });
  for (const path of ['/api/account/send-code', '/api/account/sync']) {
    assert.equal((await handler(request(path, null, { method: 'POST', headers, body }), env)).status, 401);
    const { session } = await login();
    assert.equal((await handler(request(path, session, { method: 'POST', body }), env)).status, 403);
    assert.equal((await handler(request(path, session, { method: 'POST', headers, body }), env)).status, 503);
    const limits = { limit: async () => ({ success: false }) };
    assert.equal((await handler(request(path, session, { method: 'POST', headers, body }),
      { ...env, ACCOUNT_MAIL_LIMIT: limits, ACCOUNT_LOGIN_LIMIT: limits })).status, 429);
  }
});

test('site preview stays private and only its assets allow same-origin framing', async()=>{
  assert.equal((await handler(request('/preview/rewards.html'),env)).status,401);
  const {session}=await login();
  const preview=await handler(request('/preview/rewards.html',session),env);
  assert.equal(preview.status,200);
  assert.equal(preview.headers.get('X-Frame-Options'),'SAMEORIGIN');
  assert.match(preview.headers.get('Content-Security-Policy'),/frame-ancestors 'self'/);
  assert.equal(preview.headers.get('Cache-Control'),'private, no-store');
  const admin=await handler(request('/',session),env);
  assert.equal(admin.headers.get('X-Frame-Options'),'DENY');
});
