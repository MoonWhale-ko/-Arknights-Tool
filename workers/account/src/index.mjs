import { AccountError, sendCode, getAccount } from "./game.mjs";
async function readBody(request) {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    throw new AccountError("invalid-request", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new AccountError("invalid-request", 400);
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 2048) {
      await reader.cancel();
      throw new AccountError("invalid-request", 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new AccountError("invalid-request", 400);
  }
}
export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin"),
      allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim());
    const cors =
      origin && allowed.includes(origin)
        ? {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            Vary: "Origin",
          }
        : {};
    const reply = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: {
          ...cors,
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    if (!origin || !allowed.includes(origin))
      return reply({ ok: false, error: "origin-denied" }, 403);
    const path = new URL(request.url).pathname;
    if (!["/health", "/send-code", "/login"].includes(path))
      return reply({ ok: false, error: "not-found" }, 404);
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers: cors });
    if (path === "/health" && request.method === "GET")
      return reply({
        ok: true,
        service: "arknights-account-import",
        server: "kr",
        version: 1,
      });
    if (request.method !== "POST" || path === "/health")
      return reply({ ok: false, error: "method-not-allowed" }, 405);
    try {
      const body = await readBody(request),
        email = String(body?.email || "").trim();
      if (
        body?.server !== "kr" ||
        email.length > 254 ||
        !/^\S+@[^\s@]+\.[^\s@]+$/.test(email)
      )
        throw new AccountError("invalid-request", 400);
      if (path === "/login" && !/^\d{6}$/.test(String(body.code || "")))
        throw new AccountError("invalid-code", 400);
      const limiter = path === "/send-code" ? env.MAIL_LIMIT : env.LOGIN_LIMIT;
      if (!limiter || !env.IP_LIMIT)
        throw new AccountError("not-configured", 503);
      const hash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(email.toLowerCase()),
      );
      const key = Array.from(new Uint8Array(hash), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      if (
        !(await env.IP_LIMIT.limit({ key: ip })).success ||
        !(await limiter.limit({ key })).success
      )
        throw new AccountError("too-many", 429);
      if (path === "/send-code") {
        await sendCode(email);
        return reply({ ok: true });
      }
      return reply({
        ok: true,
        data: await getAccount(email, String(body.code)),
      });
    } catch (e) {
      return reply(
        {
          ok: false,
          error: e instanceof AccountError ? e.code : "internal-error",
        },
        e instanceof AccountError ? e.status : 500,
      );
    }
  },
};
