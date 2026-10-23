import { createRemoteJWKSet, jwtVerify } from 'jose';

const resolvers = new Map();
export class AdminError extends Error {
  constructor(code, status = 400) { super(code); this.status = status; }
}

// Headers containing an email are not authentication. Only a signed Access JWT is trusted.
export async function authenticate(request, env, resolveKeys) {
  const domain = String(env.ACCESS_TEAM_DOMAIN || '').replace(/\/$/, '');
  const audience = String(env.ACCESS_AUD || '').trim();
  const email = String(env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(domain) ||
      !audience || !/^\S+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AdminError('auth-not-configured', 503);
  }
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token || token.length > 16384) throw new AdminError('login-required', 401);
  let payload;
  try {
    let keys = resolveKeys;
    if (!keys) {
      if (!resolvers.has(domain)) resolvers.set(domain, createRemoteJWKSet(new URL(domain + '/cdn-cgi/access/certs')));
      keys = resolvers.get(domain);
    }
    ({ payload } = await jwtVerify(token, keys, {
      algorithms: ['RS256'], issuer: domain, audience,
      requiredClaims: ['exp', 'iat', 'sub', 'email'], clockTolerance: 5,
    }));
  } catch {
    throw new AdminError('login-required', 401);
  }
  if (typeof payload.email !== 'string' || payload.email.toLowerCase() !== email ||
      payload.type !== 'app' || payload.iat > Date.now() / 1000 + 5) {
    throw new AdminError('access-denied', 403);
  }
  return { email: payload.email };
}

export function assertMutation(request) {
  // Same-origin JSON + custom header. Access cookies alone cannot authorize a CSRF request.
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
