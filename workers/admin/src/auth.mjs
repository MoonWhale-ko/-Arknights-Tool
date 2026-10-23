import { SignJWT, jwtVerify } from 'jose';

export class AdminError extends Error {
  constructor(code, status = 400) { super(code); this.status = status; }
}
const SESSION = '__Host-admin_session';
const FLOW = '__Host-admin_oauth';
const TTL = 4 * 60 * 60;
function cookie(name, value, seconds) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${seconds}`;
}
function cookies(request, name) {
  const values = (request.headers.get('Cookie') || '').split(';').map(x => x.trim()).filter(x => x.startsWith(name + '='));
  return values.length === 1 ? values[0].slice(name.length + 1) : '';
}
function config(env) {
  const origin = env.ADMIN_ORIGIN;
  if (!origin || !/^https:\/\/[^/]+$/.test(origin) || !/^\d+$/.test(env.ADMIN_GITHUB_ID || '') ||
      !env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || env.GITHUB_CLIENT_SECRET.length < 32) {
    throw new AdminError('auth-not-configured', 503);
  }
  return { origin, owner: env.ADMIN_GITHUB_ID };
}
async function key(env, purpose) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(env.GITHUB_CLIENT_SECRET + ':' + purpose)));
}
async function sign(payload, env, purpose, seconds) {
  return new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setIssuer(env.ADMIN_ORIGIN)
    .setAudience('admin-' + purpose).setIssuedAt().setExpirationTime(Math.floor(Date.now() / 1000) + seconds).sign(await key(env, purpose));
}
async function verify(value, env, purpose) {
  const { payload } = await jwtVerify(value, await key(env, purpose), { algorithms: ['HS256'], issuer: env.ADMIN_ORIGIN,
    audience: 'admin-' + purpose, requiredClaims: ['iat', 'exp'], maxTokenAge: purpose === 'flow' ? '10m' : '4h' });
  return payload;
}
function random() {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export async function authenticate(request, env) {
  const { origin, owner } = config(env);
  if (new URL(request.url).origin !== origin) throw new AdminError('origin-denied', 403);
  let session;
  try { session = await verify(cookies(request, SESSION), env, 'session'); }
  catch { throw new AdminError('login-required', 401); }
  if (session.sub !== owner || typeof session.login !== 'string') throw new AdminError('access-denied', 403);
  return { login: session.login };
}
export async function startLogin(request, env) {
  const { origin } = config(env);
  if (new URL(request.url).origin !== origin) throw new AdminError('origin-denied', 403);
  const state = random(), verifier = random();
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  const challenge = btoa(String.fromCharCode(...digest)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const url = new URL('https://github.com/login/oauth/authorize');
  for (const [k, v] of Object.entries({ client_id: env.GITHUB_CLIENT_ID, redirect_uri: origin + '/auth/callback',
    state, code_challenge: challenge, code_challenge_method: 'S256', allow_signup: 'false', scope: '' })) url.searchParams.set(k, v);
  return new Response(null, { status: 302, headers: { Location: url.href,
    'Set-Cookie': cookie(FLOW, await sign({ state, verifier }, env, 'flow', 600), 600) } });
}
export async function finishLogin(request, env, fetcher = fetch) {
  const { origin, owner } = config(env);
  const url = new URL(request.url);
  if (url.origin !== origin) throw new AdminError('origin-denied', 403);
  let flow;
  try { flow = await verify(cookies(request, FLOW), env, 'flow'); } catch { throw new AdminError('invalid-oauth-state', 403); }
  if (url.searchParams.getAll('state').length !== 1 || !flow.state || flow.state !== url.searchParams.get('state') ||
      !/^[A-Za-z0-9_-]{43}$/.test(flow.verifier || '') || url.searchParams.getAll('code').length !== 1 || !url.searchParams.get('code') ||
      url.searchParams.get('code').length > 256) throw new AdminError('invalid-oauth-state', 403);
  const exchange = await fetcher('https://github.com/login/oauth/access_token', { method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET, code: url.searchParams.get('code'), redirect_uri: origin + '/auth/callback', code_verifier: flow.verifier }) });
  if (!exchange.ok) throw new AdminError('oauth-failed', 502);
  const result = await exchange.json();
  if (typeof result.access_token !== 'string' || result.error) throw new AdminError('oauth-failed', 502);
  // This short-lived use of the OAuth token only establishes identity. It is never put in cookies or browser storage.
  const profile = await fetcher('https://api.github.com/user', { headers: { Accept: 'application/vnd.github+json',
    'User-Agent': 'arknights-private-admin', Authorization: 'Bearer ' + result.access_token } });
  if (!profile.ok) throw new AdminError('oauth-failed', 502);
  const user = await profile.json();
  if (String(user.id) !== owner || typeof user.login !== 'string') throw new AdminError('access-denied', 403);
  const headers = new Headers({ Location: '/' });
  headers.append('Set-Cookie', cookie(SESSION, await sign({ sub: owner, login: user.login }, env, 'session', TTL), TTL));
  headers.append('Set-Cookie', cookie(FLOW, '', 0));
  return new Response(null, { status: 302, headers });
}
export function logout() {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  headers.append('Set-Cookie', cookie(SESSION, '', 0)); headers.append('Set-Cookie', cookie(FLOW, '', 0));
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}
export const clearFlow = () => cookie(FLOW, '', 0);

export function assertMutation(request) {
  // Same-origin JSON + custom header. Session cookies alone cannot authorize a CSRF request.
  if (request.headers.get('Origin') !== new URL(request.url).origin ||
      request.headers.get('X-Admin-Request') !== '1' ||
      request.headers.get('Content-Type')?.split(';')[0].trim() !== 'application/json') {
    throw new AdminError('origin-denied', 403);
  }
}

export async function readJSON(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new AdminError('invalid-json');
  let size = 0;
  const parts = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 1024 * 1024) { await reader.cancel(); throw new AdminError('body-too-large', 413); }
    parts.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new AdminError('invalid-json'); }
}
