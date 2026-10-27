import { AdminError, authenticate, assertMutation, readJSON, startLogin, finishLogin, logout, clearFlow } from './auth.mjs';
import { githubClient, FILES } from './data.mjs';
import { accountRequest } from './account.mjs';
import { AccountError } from '../../account/src/game.mjs';

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
export function createHandler({ fetcher } = {}) {
  return async function handle(request, env) {
    const path = new URL(request.url).pathname;
    const secure = response => {
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(security)) headers.set(key, value);
      return new Response(response.body, { status: response.status, headers });
    };
    try {
      if (request.method === 'GET' && path === '/auth/start') return secure(await startLogin(request, env));
      if (request.method === 'GET' && path === '/auth/callback') return secure(await finishLogin(request, env, fetcher));
      if (request.method === 'GET' && ['/login', '/login.css'].includes(path)) {
        // Assets resolves /login to login.html. Requesting /login.html instead would
        // canonicalize back to /login, causing a self-redirect loop with run_worker_first.
        return secure(await env.ASSETS.fetch(request));
      }
      // Public design preview contains only static game assets and synthetic data.
      // All APIs, account operations and other preview pages still authenticate below.
      const wardrobeAssets = new Set([
        '/wardrobe/style.css', '/wardrobe/ui.js', '/wardrobe/sd.js', '/wardrobe/btn-back.png',
        '/wardrobe/original-layout.js', '/wardrobe/catalog.json',
        '/wardrobe/sd-models.json', '/wardrobe/native-scene.json.gz',
        '/preview/assets/css/zoot.css', '/preview/assets/js/zoot.js',
      ]);
      if (['GET', 'HEAD'].includes(request.method) && (path === '/wardrobe-demo' || wardrobeAssets.has(path))) {
        const assetRequest = path === '/wardrobe-demo'
          ? new Request(new URL('/preview/wardrobe', request.url), { method: 'GET' }) : request;
        const response = await env.ASSETS.fetch(assetRequest);
        const headers = new Headers(response.headers);
        for (const [key, value] of Object.entries(security)) headers.set(key, value);
        if (path === '/wardrobe-demo') {
          headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' https://fonts.googleapis.com https://cdn.jsdelivr.net 'unsafe-inline'; font-src 'self' https://raw.githubusercontent.com https://fonts.gstatic.com https://cdn.jsdelivr.net; img-src 'self' https://raw.githubusercontent.com data: blob:; connect-src 'self' https://raw.githubusercontent.com; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
          headers.set('Content-Type', 'text/html; charset=utf-8');
          headers.delete('Content-Length'); headers.delete('Content-Encoding'); headers.delete('ETag');
          const html = (await response.text())
            .replace('<body class="zoot-page">', '<body class="zoot-page" data-wardrobe-demo="true">')
            .replace('href="assets/css/zoot.css', 'href="/preview/assets/css/zoot.css')
            .replace(/<script src="assets\/js\/zoot\.js[^"]*"><\/script>/, '');
          return new Response(request.method === 'HEAD' ? null : html, { status: response.status, headers });
        }
        return new Response(request.method === 'HEAD' ? null : response.body, { status: response.status, headers });
      }
      const identity = await authenticate(request, env);
      if (!['GET', 'HEAD', 'POST'].includes(request.method)) throw new AdminError('method-not-allowed', 405);
      if (request.method === 'POST') assertMutation(request);
      if (path === '/auth/logout' && request.method === 'POST') return secure(logout());
      if (path === '/api/session' && request.method === 'GET') return json({ ok: true, ...identity });
      if (['/api/account/send-code', '/api/account/sync'].includes(path) && request.method === 'POST')
        return json(await accountRequest(request, env, fetcher));
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
      if(path.startsWith('/preview/')){
        headers.set('X-Frame-Options','SAMEORIGIN');
        headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self' https: 'unsafe-inline'; style-src 'self' https: 'unsafe-inline'; img-src 'self' https: data: blob:; font-src 'self' https: data:; connect-src 'self' https:; worker-src 'self' blob:; frame-ancestors 'self'; base-uri 'self'; form-action 'self'");
      }
      return new Response(response.body, { status: response.status, headers });
    } catch (error) {
      if (error instanceof AccountError) return json({ ok: false, error: error.code,
        ...(error.stage ? { stage: error.stage } : {}), ...(error.upstreamStatus ? { upstreamStatus: error.upstreamStatus } : {}) }, error.status);
      if (error instanceof AdminError && error.message === 'login-required' && path === '/' && request.method === 'GET')
        return secure(new Response(null, { status: 302, headers: { Location: '/login' } }));
      // Do not log tokens, emails, GitHub responses or account payloads.
      const response = json({ ok: false, error: error instanceof AdminError ? error.message : 'internal-error' }, error instanceof AdminError ? error.status : 500);
      if (path === '/auth/callback') response.headers.append('Set-Cookie', clearFlow());
      return response;
    }
  };
}
export default { fetch: createHandler() };
