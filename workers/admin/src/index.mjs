import { AdminError, authenticate, assertMutation, readJSON } from './auth.mjs';
import { githubClient, FILES } from './data.mjs';

const security = {
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...security, 'Content-Type': 'application/json; charset=utf-8' } });
}

// Dependency injection is used only by tests, never selected through an environment flag or route.
export function createHandler({ resolveKeys, fetcher } = {}) {
  return async function handle(request, env) {
    try {
      const identity = await authenticate(request, env, resolveKeys);
      const path = new URL(request.url).pathname;
      if (!['GET', 'HEAD', 'POST'].includes(request.method)) throw new AdminError('method-not-allowed', 405);
      if (request.method === 'POST') assertMutation(request);
      if (path === '/api/session' && request.method === 'GET') return json({ ok: true, ...identity });
      const gh = githubClient(env, fetcher);
      const file = path.match(/^\/api\/files\/([a-z]+)$/)?.[1];
      if (file) {
        if (!Object.hasOwn(FILES, file)) throw new AdminError('not-found', 404);
        if (request.method === 'GET') return json({ ok: true, ...(await gh.read(file)) });
        throw new AdminError('method-not-allowed', 405);
      }
      if (path === '/api/save' && request.method === 'POST') {
        const body = await readJSON(request);
        return json({ ok: true, ...(await gh.save(body.changes)) });
      }
      if (path === '/api/refresh' && request.method === 'POST') {
        await readJSON(request);
        return json({ ok: true, ...(await gh.refresh()) }, 202);
      }
      if (path === '/api/runs' && request.method === 'GET') return json({ ok: true, runs: await gh.runs() });
      if (path.startsWith('/api/')) throw new AdminError('not-found', 404);
      if (!['GET', 'HEAD'].includes(request.method)) throw new AdminError('method-not-allowed', 405);
      const response = await env.ASSETS.fetch(request);
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(security)) headers.set(key, value);
      return new Response(response.body, { status: response.status, headers });
    } catch (error) {
      // Do not log tokens, emails, GitHub responses or account payloads.
      return json({ ok: false, error: error instanceof AdminError ? error.message : 'internal-error' }, error instanceof AdminError ? error.status : 500);
    }
  };
}
export default { fetch: createHandler() };
