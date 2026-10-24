import test from 'node:test';
import assert from 'node:assert/strict';
import { accountRequest } from '../src/account.mjs';
test('private account sync retains the entire syncData response, and sends no account data to GitHub', async () => {
  const snapshot = { result: 0, ts: 1234, unknownRoot: ['kept'], user: { troop: { chars: {} },
    dungeon: { stages: { 'stage#f#': { state: 3 } } }, status: { uid: 'account-id' },
    futureField: { nested: [false, null, 0] }, mission: {}, retro: {}, medal: {}, building: {} } };
  const responses = [
    { Code: 200, Data: { Token: 'mail-token' } },
    { Code: 200, Data: { UserInfo: { ID: 'sdk-id', Token: 'sdk-token' } } },
    { content: JSON.stringify({ funcVer: '1', configs: { 1: { network: {
      gs: 'https://gs.arknights.kr', u8: 'https://as.arknights.kr/u8', hv: 'https://hv.arknights.kr/{0}' } } } }) },
    { result: 0, uid: 'game-id', token: 'u8-token' }, { resVersion: 'res', clientVersion: 'client' },
    { result: 0, secret: 'session-secret' }, snapshot, { goodList: [] }, { goodList: [] },
  ];
  const replay = structuredClone(responses);
  const calls = [], limiter = { limit: async () => ({ success: true }) };
  const request = new Request('https://admin.example/api/account/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.kr', code: '123456', server: 'kr' }) });
  const retryRequest = request.clone();
  const result = await accountRequest(request, { ACCOUNT_LOGIN_LIMIT: limiter }, async (url) => { calls.push(url); return Response.json(responses.shift()); });
  assert.deepEqual(result.snapshot, snapshot); assert.equal(result.source, '/account/syncData'); assert.equal(result.server, 'kr');
  assert.equal(calls.length, 9); assert.ok(calls.every(url => !url.includes('github')));
  assert.deepEqual(calls.slice(-2).map(url => new URL(url).pathname), ['/shop/getLowGoodList', '/shop/getExtraGoodList']);
  let failedCalls=0;
  const partial=await accountRequest(retryRequest,{ACCOUNT_LOGIN_LIMIT:limiter},async()=>{failedCalls++;if(failedCalls>7)throw Error('network');return Response.json(replay.shift());});
  assert.deepEqual(partial.snapshot,snapshot);assert.equal(failedCalls,8);assert.equal(partial.supplementary.shopErrors.LS,'upstream-unavailable');
  assert.ok(!JSON.stringify(result).includes('session-secret')); assert.ok(!JSON.stringify(result).includes('mail-token'));
});
