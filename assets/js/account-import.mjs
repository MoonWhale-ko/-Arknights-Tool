import {
  prepareImport,
  commitImport,
  restoreImport,
  BACKUP_KEY,
} from "./account-state.mjs";
const $ = (id) => document.getElementById(id),
  dialog = $("accountDialog");
let preview = null,
  busy = false,
  controller = null,
  ready = false,
  retryUntil = 0,
  ticker = null;
const messages = {
  "too-many": "요청이 많습니다. 1분 후 다시 시도해 주세요.",
  captcha: "요스타에서 추가 인증을 요구했습니다. 잠시 후 다시 시도해 주세요.",
  "authentication-failed": "이메일 또는 인증번호를 확인해 주세요.",
  "game-login-failed":
    "게임 로그인에 실패했습니다. 게임을 종료한 뒤 다시 시도해 주세요.",
  "sync-failed": "게임 데이터를 가져오지 못했습니다. 다시 시도해 주세요.",
  "origin-denied": "이 사이트 주소가 계정 서버에 허용되지 않았습니다.",
  "not-configured": "계정 서버 배포 설정을 확인해 주세요.",
  "send-code-failed":
    "인증 메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.",
  "upstream-unavailable": "요스타 또는 게임 서버에 연결하지 못했습니다.",
  "upstream-format": "게임 서버 응답 형식이 변경되었습니다.",
  "invalid-code": "6자리 인증번호를 입력해 주세요.",
};
function api() {
  const value = window.ARKNIGHTS_ACCOUNT_API;
  if (!value) return null;
  const u = new URL(value);
  if (u.protocol !== "https:" || u.username || u.password || u.search || u.hash)
    throw new Error("계정 서버 주소 설정을 확인해 주세요.");
  return u.href.replace(/\/$/, "");
}
const status = (text) => ($("accountMessage").textContent = text);
function buttons() {
  const remaining = Math.max(0, Math.ceil((retryUntil - Date.now()) / 1000));
  $("accountSend").disabled = busy || !ready || remaining > 0;
  $("accountSend").textContent = remaining
    ? `재발송 ${remaining}초 후`
    : "인증번호 받기";
  $("accountFetch").disabled = busy || !ready;
  $("accountApply").disabled = busy || !preview;
  $("accountUndo").disabled = busy || !localStorage.getItem(BACKUP_KEY);
}
async function request(path, body) {
  const root = api();
  if (!root) throw new Error("Cloudflare 계정 서버 연결 준비 중입니다.");
  controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
  try {
    const r = await fetch(root + path, {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : {},
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
    });
    const j = await r.json();
    if (!r.ok || !j.ok)
      throw new Error(messages[j.error] || "계정 서버 요청에 실패했습니다.");
    return j;
  } catch (e) {
    if (e.name === "AbortError")
      throw new Error("조회가 취소되었거나 시간이 초과되었습니다.");
    throw e;
  } finally {
    clearTimeout(timeout);
    controller = null;
  }
}
async function action(fn) {
  if (busy) return;
  busy = true;
  buttons();
  try {
    await fn();
  } catch (e) {
    status(
      e instanceof TypeError
        ? "계정 서버에 연결하지 못했습니다. 연결 설정을 확인해 주세요."
        : e.message,
    );
  } finally {
    busy = false;
    buttons();
  }
}
$("gameImport").onclick = () => {
  preview = null;
  ready = false;
  dialog.showModal();
  buttons();
  action(async () => {
    if (!api()) {
      status(
        "Cloudflare 계정 서버 연결 준비 중입니다. 배포 주소가 설정되면 이메일 인증으로 가져올 수 있습니다.",
      );
      return;
    }
    const health = await request("/health");
    if (health.service !== "arknights-account-import" || health.server !== "kr")
      throw new Error("계정 서버 주소를 확인해 주세요.");
    ready = true;
    status("이메일로 인증번호를 받아 현재 상태를 조회하세요.");
  });
};
$("accountSend").onclick = () => {
  if (!$("accountEmail").reportValidity()) return;
  action(async () => {
    preview = null;
    await request("/send-code", {
      server: "kr",
      email: $("accountEmail").value.trim(),
    });
    retryUntil = Date.now() + 60000;
    if (!ticker)
      ticker = setInterval(() => {
        buttons();
        if (Date.now() >= retryUntil) {
          clearInterval(ticker);
          ticker = null;
        }
      }, 1000);
    status("인증 메일을 보냈습니다. 스팸함도 확인해 주세요.");
  });
};
$("accountForm").onsubmit = (e) => {
  e.preventDefault();
  action(async () => {
    preview = null;
    status("현재 육성 상태와 재료를 조회하고 있습니다.");
    const result = await request("/login", {
      server: "kr",
      email: $("accountEmail").value.trim(),
      code: $("accountCode").value.trim(),
    });
    $("accountCode").value = "";
    const r = await fetch("data/account-favor.json");
    if (!r.ok) throw new Error("신뢰도 변환표를 불러오지 못했습니다.");
    const favor = await r.json();
    const adapter = window.operatorAccount;
    if (!adapter.chars.length)
      throw new Error("오퍼레이터 데이터를 먼저 불러와야 합니다.");
    preview = prepareImport(
      result.data,
      adapter.chars,
      adapter.state,
      favor.frames,
    );
    status(
      `보유 ${preview.owned}명 · 재료 ${Object.keys(preview.inventory.items).length}종 조회 완료${preview.skipped ? `\n사이트 미수록 ${preview.skipped}명 제외` : ""}\n적용하면 현재 보유·육성 상태와 재료가 갱신됩니다. 적용 전 상태는 자동 백업합니다.`,
    );
  });
};
$("accountApply").onclick = () =>
  action(async () => {
    const adapter = window.operatorAccount;
    commitImport(localStorage, adapter.key, preview);
    adapter.replace(preview.state);
    preview = null;
    status("현재 육성 상태와 보유 재료를 적용했습니다.");
  });
$("accountUndo").onclick = () =>
  action(async () => {
    const adapter = window.operatorAccount;
    adapter.replace(restoreImport(localStorage, adapter.key));
    preview = null;
    status("가져오기 전 육성 상태와 재료를 복원했습니다.");
  });
function close() {
  controller?.abort();
  preview = null;
  $("accountEmail").value = "";
  $("accountCode").value = "";
  dialog.close();
}
$("accountClose").onclick = close;
dialog.addEventListener("cancel", (e) => {
  e.preventDefault();
  close();
});
