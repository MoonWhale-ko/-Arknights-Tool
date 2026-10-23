import { sendCode, getAccountSyncData } from '../../account/src/game.mjs';
import { AdminError, readJSON } from './auth.mjs';

// Called only after owner-session authentication and same-origin mutation checks.
export async function accountRequest(request, env, fetcher) {
  const path = new URL(request.url).pathname;
  const body = await readJSON(request);
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  if (!/^\S+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || body.server !== 'kr') throw new AdminError('invalid-request');
  const login = path.endsWith('/sync');
  if (login && !/^\d{6}$/.test(String(body.code || ''))) throw new AdminError('invalid-code');
  const limiter = login ? env.ACCOUNT_LOGIN_LIMIT : env.ACCOUNT_MAIL_LIMIT;
  if (!limiter) throw new AdminError('account-not-configured', 503);
  if (!(await limiter.limit({ key: 'owner' })).success) throw new AdminError('too-many', 429);
  if (!login) { await sendCode(email, fetcher); return { ok: true }; }
  // Preserve every syncData field, including unknown fields and root metadata. Never write it to GitHub or a database.
  return { ok: true, importedAt: new Date().toISOString(), server: 'kr', source: '/account/syncData',
    snapshot: await getAccountSyncData(email, String(body.code), fetcher) };
}
