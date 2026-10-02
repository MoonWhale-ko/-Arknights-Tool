import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.mjs";
import {
  getAccount,
  sendCode,
  normalizeAccount,
  u8Sign,
  trustedUrl,
} from "../src/game.mjs";
const origin = "https://moonwhale-ko.github.io";
const accept = { limit: async () => ({ success: true }) };
const env = {
  ALLOWED_ORIGINS: origin,
  IP_LIMIT: accept,
  MAIL_LIMIT: accept,
  LOGIN_LIMIT: accept,
};
const request = (path, body, site = origin) =>
  new Request("https://test.workers.dev" + path, {
    method: body ? "POST" : "GET",
    headers: { Origin: site, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
test("CORS and validation fail before authentication", async () => {
  assert.equal((await worker.fetch(request("/health"), env)).status, 200);
  assert.equal(
    (
      await worker.fetch(
        request(
          "/login",
          { email: "x@y.kr", code: "123456", server: "kr" },
          "https://other.example",
        ),
        env,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await worker.fetch(
        request("/login", { email: "x@y.kr", code: "bad", server: "kr" }),
        env,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await worker.fetch(
        request("/send-code", { email: "x@y.kr", server: "en" }),
        env,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await worker.fetch(
        request("/send-code", { email: "x@y.kr", server: "kr" }),
        { ...env, IP_LIMIT: { limit: async () => ({ success: false }) } },
      )
    ).status,
    429,
  );
  const preflight = new Request("https://test.workers.dev/login", {
    method: "OPTIONS",
    headers: { Origin: origin },
  });
  assert.equal((await worker.fetch(preflight, env)).status, 204);
});
const user = {
  troop: {
    chars: {
      1: {
        charId: "char_103_angel",
        evolvePhase: 2,
        level: 90,
        potentialRank: 3,
        favorPoint: 25570,
        mainSkillLvl: 7,
        skills: [{ skillId: "skcom_atk_up[3]", specializeLevel: 2 }],
        equip: {
          uniequip_002_angel: { locked: 0, level: 3 },
          locked: { locked: 1, level: 1 },
        },
      },
      2: {
        charId: "char_002_amiya",
        evolvePhase: 2,
        level: 80,
        potentialRank: 5,
        favorPoint: 20000,
        mainSkillLvl: 7,
        tmpl: {
          char_002_amiya: { skills: [], equip: {} },
          char_1001_amiya2: {
            skills: [{ skillId: "sword", specializeLevel: 3 }],
            equip: {},
          },
        },
      },
    },
  },
  inventory: { 3001: 12 },
  status: { gold: 9000, nickName: "private" },
};
test("normalization includes class variants, actual modules and only needed fields", () => {
  const data = normalizeAccount(user);
  assert.equal(data.operators.length, 3);
  assert.equal(data.operators[0].potential, 4);
  assert.equal(data.operators[0].modules.locked, 0);
  assert.equal(data.inventory["4001"], 9000);
  assert.equal(data.player, undefined);
  assert.equal(JSON.stringify(data).includes("private"), false);
});
test("full KR authentication sequence, signatures and session sequence", async () => {
  const calls = [];
  const responses = [
    { Code: 200, Data: { Token: "mail-token" } },
    { Code: 200, Data: { UserInfo: { ID: "sdk-id", Token: "sdk-token" } } },
    {
      content: JSON.stringify({
        funcVer: "1",
        configs: {
          1: {
            network: {
              gs: "https://gs.arknights.kr",
              u8: "https://as.arknights.kr/u8",
              hv: "https://ark-kr-static-online-1300509597.yo-star.com/assetbundle/official/{0}/version",
            },
          },
        },
      }),
    },
    { result: 0, uid: "game-id", token: "u8-token" },
    { resVersion: "res", clientVersion: "client" },
    { result: 0, uid: "game-id", secret: "session-secret" },
    { result: 0, user },
  ];
  const mock = async (url, init) => {
    calls.push({ url, init });
    return Response.json(responses.shift());
  };
  const data = await getAccount("test@example.kr", "123456", mock);
  assert.equal(calls.length, 7);
  assert.equal(data.operators.length, 3);
  assert.equal(calls[5].init.headers.seqnum, "1");
  assert.equal(calls[6].init.headers.seqnum, "2");
  const b = JSON.parse(calls[3].init.body),
    sign = b.sign;
  delete b.sign;
  assert.equal(u8Sign(b), sign);
  assert.equal(
    JSON.parse(calls[0].init.headers.Authorization).Head.PID,
    "KR-ARKNIGHTS",
  );
  assert.ok(!JSON.stringify(data).includes("token"));
  assert.ok(!JSON.stringify(data).includes("secret"));
});
test("HTTP success with SDK rejection must not report email sent", async () => {
  await assert.rejects(
    sendCode("a@b.kr", async () => Response.json({ Code: 500, Data: null })),
    /send-code-failed/,
  );
});
test("request size is bounded even without Content-Length", async () => {
  const r = await worker.fetch(
    request("/send-code", { email: "a".repeat(3000), server: "kr" }),
    env,
  );
  assert.equal(r.status, 413);
});

test("official KR version CDN is allowed only for version lookup", () => {
  const url = "https://ark-kr-static-online-1300509597.yo-star.com/assetbundle/official/Android/version";
  assert.equal(trustedUrl(url, "version"), url);
  assert.throws(() => trustedUrl(url));
  assert.throws(() => trustedUrl("https://evil.yo-star.com/version", "version"));
  assert.throws(() => trustedUrl("https://gs.arknights.kr:1234"));
});
test("upstream failures disclose only safe stage and HTTP status", async () => {
  await assert.rejects(sendCode("test@example.kr", async () => new Response("private upstream body", {status: 403})), e => {
    assert.equal(e.stage, "send-code");
    assert.equal(e.upstreamStatus, 403);
    assert.equal(e.message, "upstream-unavailable");
    return true;
  });
});
