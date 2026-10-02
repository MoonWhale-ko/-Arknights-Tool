// KR protocol reference: ArkPRTS auth.py and neeia/ak-roster yostarAuth.ts.
// Only authentication and account/syncData; no game actions or retained sessions.
import { createHash, createHmac, randomUUID } from "node:crypto";
export class AccountError extends Error {
  constructor(code, status = 502, stage = undefined, upstreamStatus = undefined) {
    super(code);
    this.code = code;
    this.status = status;
    this.stage = stage;
    this.upstreamStatus = upstreamStatus;
  }
}
const SDK = "https://jp-sdk-api.yostarplat.com";
const headers = {
  "Content-Type": "application/json",
  "X-Unity-Version": "2017.4.39f1",
  "User-Agent":
    "Dalvik/2.1.0 (Linux; U; Android 11; KB2000 Build/RP1A.201005.001)",
};
export function signedHeaders(body, deviceId = randomUUID()) {
  const Head = {
    PID: "KR-ARKNIGHTS",
    Channel: "googleplay",
    Platform: "android",
    Version: "4.10.0",
    GVersionNo: "2000112",
    GBuildNo: "",
    Lang: "ko",
    DeviceID: deviceId,
    DeviceModel: "F9",
    UID: "",
    Token: "",
    Time: Math.floor(Date.now() / 1000),
  };
  const Sign = createHash("md5")
    .update(
      JSON.stringify(Head) + body + "886c085e4a8d30a703367b120dd8353948405ec2",
    )
    .digest("hex")
    .toUpperCase();
  return { ...headers, Authorization: JSON.stringify({ Head, Sign }) };
}
export function u8Sign(body) {
  return createHmac("sha1", "91240f70c09a08a6bc72af1a5c8d4670")
    .update(
      new URLSearchParams(
        Object.keys(body)
          .sort()
          .map((k) => [k, String(body[k])]),
      ).toString(),
    )
    .digest("hex");
}
async function jsonRequest(url, body, extra = {}, fetcher = fetch) {
  const path = new URL(url).pathname;
  const stage = path.endsWith("/send-code") ? "send-code"
    : path.endsWith("/get-auth") ? "email-auth"
    : path === "/user/login" ? "sdk-login"
    : path.endsWith("/network_config") ? "network-config"
    : path.endsWith("/getToken") ? "u8-token"
    : path.endsWith("/version") ? "game-version"
    : path.endsWith("/account/login") ? "game-login"
    : path.endsWith("/syncData") ? "sync-data" : undefined;
  let response;
  try {
    response = await fetcher(url, {
      method: body === undefined ? "GET" : "POST",
      headers: { ...headers, ...extra },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(15000),
      redirect: "error",
    });
  } catch {
    throw new AccountError("upstream-unavailable", 502, stage);
  }
  if (!response.ok)
    throw new AccountError(
      response.status === 429 ? "too-many" : "upstream-unavailable",
      response.status === 429 ? 429 : 502,
      stage,
      response.status,
    );
  try {
    return await response.json();
  } catch {
    throw new AccountError("upstream-format", 502, stage);
  }
}
async function sdk(path, body, fetcher) {
  const result = await jsonRequest(
    SDK + path,
    body,
    signedHeaders(JSON.stringify(body)),
    fetcher,
  );
  if (result.Code !== 200) {
    // Never forward upstream messages: they can contain account identifiers.
    const code = String(result.Code);
    throw new AccountError(
      code === "50015"
        ? "captcha"
        : path === "/yostar/send-code"
          ? "send-code-failed"
          : "authentication-failed",
      400,
    );
  }
  return result.Data;
}
export async function sendCode(email, fetcher) {
  await sdk(
    "/yostar/send-code",
    { Account: email, Randstr: "", Ticket: "" },
    fetcher,
  );
}
export function trustedUrl(value, role = "game") {
  let u;
  try {
    u = new URL(value);
  } catch {
    throw new AccountError("upstream-format");
  }
  if (
    u.protocol !== "https:" ||
    !(u.hostname === "arknights.kr" || u.hostname.endsWith(".arknights.kr") ||
      (role === "version" && u.hostname === "ark-kr-static-online-1300509597.yo-star.com")) ||
    u.username ||
    u.password ||
    (u.port && u.port !== "443")
  )
    throw new AccountError("upstream-format");
  return value.replace(/\/$/, "");
}
export async function getAccount(email, code, fetcher) {
  const auth = await sdk(
    "/yostar/get-auth",
    { Account: email, Code: code },
    fetcher,
  );
  if (!auth?.Token) throw new AccountError("authentication-failed", 400);
  const login = await sdk(
    "/user/login",
    {
      CheckAccount: 0,
      Geetest: {
        CaptchaID: null,
        CaptchaOutput: null,
        GenTime: null,
        LotNumber: null,
        PassToken: null,
      },
      OpenID: email,
      Secret: "",
      Token: auth.Token,
      Type: "yostar",
      UserName: email,
    },
    fetcher,
  );
  const info = login?.UserInfo;
  if (!info?.ID || !info?.Token)
    throw new AccountError("authentication-failed", 400);
  const config = await jsonRequest(
    "https://ak-conf.arknights.kr/config/prod/official/network_config",
    undefined,
    {},
    fetcher,
  );
  let network;
  try {
    const content = JSON.parse(config.content);
    network = content.configs[content.funcVer].network;
  } catch {
    throw new AccountError("upstream-format");
  }
  const gs = trustedUrl(network.gs),
    u8 = trustedUrl(network.u8),
    hv = trustedUrl(network.hv.replace("{0}", "Android"), "version");
  const deviceId = randomUUID();
  const body = {
    appId: "1",
    platform: 1,
    channelId: "3",
    subChannel: "3",
    extension: JSON.stringify({ type: 1, uid: info.ID, token: info.Token }),
    worldId: "3",
    deviceId,
    deviceId2: "",
    deviceId3: "",
  };
  body.sign = u8Sign(body);
  const token = await jsonRequest(u8 + "/user/v1/getToken", body, {}, fetcher);
  if (token.result !== 0 || !token.token || !token.uid)
    throw new AccountError("game-login-failed");
  const version = await jsonRequest(hv, undefined, {}, fetcher);
  if (!version.resVersion || !version.clientVersion)
    throw new AccountError("upstream-format");
  const session = await jsonRequest(
    gs + "/account/login",
    {
      platform: 1,
      networkVersion: "1",
      assetsVersion: version.resVersion,
      clientVersion: version.clientVersion,
      token: token.token,
      uid: token.uid,
      deviceId,
      deviceId2: "",
      deviceId3: "",
    },
    { uid: token.uid, secret: "", seqnum: "1" },
    fetcher,
  );
  if (session.result !== 0 || !session.secret)
    throw new AccountError("game-login-failed");
  const data = await jsonRequest(
    gs + "/account/syncData",
    { platform: 1 },
    { uid: session.uid || token.uid, secret: session.secret, seqnum: "2" },
    fetcher,
  );
  if (data.result !== 0 || !data.user?.troop?.chars)
    throw new AccountError("sync-failed");
  return normalizeAccount(data.user);
}
export function normalizeAccount(user) {
  const operators = [];
  for (const value of Object.values(user.troop.chars)) {
    const variants =
      value.tmpl && Object.keys(value.tmpl).length
        ? Object.entries(value.tmpl)
        : [[value.charId, value]];
    for (const [id, variant] of variants) {
      if (typeof id !== "string" || !id.startsWith("char_")) continue;
      operators.push({
        id,
        elite: value.evolvePhase,
        level: value.level,
        potential: value.potentialRank + 1,
        favorPoint: value.favorPoint,
        skill: value.mainSkillLvl,
        skills: (variant.skills || []).map((s) => ({
          id: s.skillId,
          mastery: s.specializeLevel,
        })),
        modules: Object.fromEntries(
          Object.entries(variant.equip || {}).map(([id, m]) => [
            id,
            m.locked === 0 ? m.level : 0,
          ]),
        ),
      });
    }
  }
  const inventory = {};
  for (const [id, count] of Object.entries(user.inventory || {}))
    if (Number.isSafeInteger(count) && count >= 0) inventory[id] = count;
  if (Number.isSafeInteger(user.status?.gold) && user.status.gold >= 0)
    inventory["4001"] = user.status.gold;
  return {
    version: 1,
    server: "kr",
    importedAt: new Date().toISOString(),
    operators,
    inventory,
  };
}
