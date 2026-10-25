const $ = id => document.getElementById(id);
const state = { files: {}, selected: null, image: null, catalog: null, pending: null, busy: false, dirty: false };
const messages = {
  'auth-not-configured': 'GitHub 로그인 설정이 필요합니다. Worker에 GITHUB_CLIENT_ID와 GITHUB_CLIENT_SECRET을 설정하세요.',
  'login-required': '로그인 시간이 만료되었거나 인증이 필요합니다. 페이지를 새로고침해 다시 로그인하세요.',
  'access-denied': '허용된 관리자 계정이 아닙니다.',
  'account-not-configured': '계정 조회 제한 설정이 필요합니다. 최신 Worker 배포를 확인하세요.',
  'invalid-code': '이메일로 받은 6자리 인증번호를 입력하세요.',
  'too-many': '요청이 많습니다. 잠시 후 다시 시도하세요.',
  'authentication-failed': '이메일과 인증번호를 확인하세요.',
  'captcha': '요스타에서 추가 인증을 요구하고 있습니다. 잠시 후 다시 시도하세요.',
  'upstream-unavailable': '요스타 또는 게임 서버에 연결하지 못했습니다.',
  'send-code-failed': '인증 메일을 발송하지 못했습니다.',
  'sync-failed': '계정 동기화 응답을 가져오지 못했습니다.',
  'github-not-configured': 'Cloudflare에 GitHub 연결용 비밀값을 설정해야 합니다.',
  'github-permission': 'GitHub 연결 권한을 확인하세요. 저장소 Contents와 Actions 권한이 필요합니다.',
  'github-not-found': '필요한 데이터 파일 또는 갱신 워크플로를 찾지 못했습니다.',
  conflict: '다른 변경이 먼저 저장되었습니다. 작성한 내용은 유지됩니다. 새로고침 후 최신 내용을 확인하고 다시 수정하세요.',
  'invalid-data': '입력 형식이 올바르지 않습니다. 이름, 별칭, 이미지 주소를 확인하세요.',
  'origin-denied': '요청 출처를 확인할 수 없습니다. 관리자 주소에서 다시 시도하세요.',
};
function status(text, error = false) { $('status').textContent = text; $('status').classList.toggle('error', error); }
async function api(path, method = 'GET', body) {
  const response = await fetch(path, { method, credentials: 'same-origin', redirect: 'error',
    headers: method === 'GET' ? {} : { 'Content-Type': 'application/json', 'X-Admin-Request': '1' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  let data;
  try { data = await response.json(); } catch { throw new Error('로그인 상태를 확인한 뒤 페이지를 새로고침하세요.'); }
  if (!response.ok) throw new Error(messages[data.error] || '요청을 처리하지 못했습니다. 잠시 후 다시 시도하세요.');
  return data;
}
async function task(fn) {
  if (state.busy) return;
  state.busy = true;
  document.querySelectorAll('button').forEach(b => { b.disabled = true; });
  try { await fn(); } catch (error) { status(error.message, true); }
  finally { state.busy = false; document.querySelectorAll('button').forEach(b => { b.disabled = false; }); }
}
function node(tag, text, className) { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (className) n.className = className; return n; }
function field(form, label, id, value, type = 'text', readOnly = false) {
  const l = node('label', label); l.htmlFor = id; const input = node(type === 'textarea' ? 'textarea' : 'input');
  input.id = id; if (type !== 'textarea') input.type = type; input.value = value || ''; input.readOnly = readOnly; input.maxLength = type === 'textarea' ? 4000 : 4096;
  if (!readOnly) input.addEventListener('input', () => { state.dirty = true; });
  form.append(l, input); return input;
}
function discard() { return !state.dirty || window.confirm('아직 저장하지 않은 내용이 있습니다. 변경을 버리고 이동할까요?'); }
function candidates() {
  const ops = state.files.operators.doc.operators, future = state.files.future.doc;
  const rows = new Map(ops.map(op => [op.id, { ...op,
    ...(op.dataLocale === 'cn' && future.operators[op.id] ? { name: future.operators[op.id], isFuture: !future.releasedOperators.includes(op.id) } : {}), registered: true }]));
  for (const [id, name] of Object.entries(future.operators)) if (!rows.has(id)) rows.set(id, { id, name, isFuture: !future.releasedOperators.includes(id), registered: true });
  for (const op of state.catalog?.operators || []) if (!rows.has(op.id)) rows.set(op.id, { ...op, isFuture: !op.krReleased, registered: false });
  return [...rows.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}
function renderOperators() {
  const aliases = state.files.aliases.doc.aliases, query = $('operatorSearch').value.toLowerCase().trim(), filter = $('operatorFilter').value;
  const list = $('operatorList'); list.replaceChildren();
  const rows = candidates().filter(op => (filter !== 'new' || !op.registered) && (filter !== 'future' || op.isFuture) &&
    [op.name, op.id, ...(aliases[op.name] || [])].some(s => s.toLowerCase().includes(query)));
  for (const op of rows) {
    const button = node('button', undefined, 'record'); button.type = 'button'; button.setAttribute('aria-pressed', String(state.selected?.id === op.id));
    const title = node('span'); title.append(node('strong', op.name), node('small', op.id)); button.append(title);
    if (!op.registered || op.isFuture) button.append(node('span', !op.registered ? '추가 가능' : '미래시', 'badge'));
    button.addEventListener('click', () => { if (state.busy || !discard()) return; state.dirty = false; state.selected = op; renderOperators(); editOperator(op); }); list.append(button);
  }
  if (!rows.length) list.append(node('p', '검색 결과가 없습니다.', 'empty'));
  $('operatorCount').textContent = state.files.operators.doc.operators.length;
  $('newCount').textContent = state.catalog ? candidates().filter(x => !x.registered).length : '목록 확인';
}
function editOperator(op) {
  const form = $('operatorForm'), future = state.files.future.doc;
  form.replaceChildren(node('h3', op.name), node('p', op.id, 'id'));
  const editableName = !op.registered || op.dataLocale === 'cn' || Boolean(op.isFuture) || !op.phases;
  const name = field(form, editableName ? '표시 이름' : '한국 서버 공식 이름', 'opName', future.operators[op.id] || op.name, 'text', !editableName);
  name.maxLength = 200;
  const checkLabel = node('label', undefined, 'check'), check = node('input'); check.type = 'checkbox'; check.id = 'futureCheck'; check.checked = editableName ? !future.releasedOperators.includes(op.id) : false; check.disabled = !editableName;
  check.addEventListener('change', () => { state.dirty = true; }); checkLabel.append(check, node('span', '미래시로 표시')); form.append(checkLabel);
  if (editableName) form.append(node('p', '한국 서버 원본에 포함되면 공식 이름을 우선합니다. 저장 후 데이터 갱신이 완료되어야 목록에 반영됩니다.', 'hint'));
  const aliases = field(form, '검색 별칭 · 한 줄에 하나씩', 'opAliases', (state.files.aliases.doc.aliases[op.name] || []).join('\n'), 'textarea');
  form.append(node('p', '별칭은 같은 이름의 오퍼레이터 검색에 적용됩니다.', 'hint'));
  const actions = node('div', undefined, 'actions'), save = node('button', '변경 내용 확인', 'primary'); save.type = 'submit'; actions.append(save); form.append(actions);
  form.onsubmit = event => {
    event.preventDefault(); if (state.busy) return;
    const proposed = [];
    const newName = name.value.trim(); if (!newName) return status('이름을 입력하세요.', true);
    if (editableName) {
      const doc = structuredClone(future); doc.operators[op.id] = newName;
      doc.releasedOperators = doc.releasedOperators.filter(id => id !== op.id); if (!check.checked) doc.releasedOperators.push(op.id);
      if (JSON.stringify(doc) !== JSON.stringify(future)) proposed.push({ key: 'future', doc });
    }
    const list = [...new Set(aliases.value.split('\n').map(x => x.trim()).filter(Boolean))];
    const doc = structuredClone(state.files.aliases.doc);
    const targetName = editableName ? newName : op.name;
    if (targetName !== op.name) delete doc.aliases[op.name];
    if (list.length) doc.aliases[targetName] = list; else delete doc.aliases[targetName];
    if (JSON.stringify(doc) !== JSON.stringify(state.files.aliases.doc)) proposed.push({ key: 'aliases', doc });
    review(proposed, op.name + ' 정보 수정', { 이름: newName, 미래시: editableName ? check.checked : Boolean(op.isFuture), 별칭: list });
  };
}
function renderImages() {
  const q = $('imageSearch').value.toLowerCase().trim(), list = $('imageList'); list.replaceChildren();
  for (const [id, item] of Object.entries(state.files.images.doc.items).filter(([id, item]) => (id + ' ' + item.name).toLowerCase().includes(q))) {
    const b = node('button', undefined, 'record'); b.type = 'button'; b.setAttribute('aria-pressed', String(state.image === id));
    const title = node('span'); title.append(node('strong', item.name), node('small', id)); b.append(title);
    b.onclick = () => { if (state.busy || !discard()) return; state.dirty = false; state.image = id; renderImages(); editImage(id); }; list.append(b);
  }
  if (!list.children.length) list.append(node('p', '검색 결과가 없습니다.', 'empty'));
}
function editImage(id) {
  const form = $('imageForm'), item = state.files.images.doc.items[id]; form.replaceChildren(node('h3', item.name), node('p', id, 'id'));
  const name = field(form, '아이템 이름', 'itemName', item.name, 'text', true), url = field(form, '이미지 주소 · HTTPS 또는 assets/ 경로', 'itemURL', item.url);
  const preview = node('img', undefined, 'preview'); preview.alt = item.name; preview.referrerPolicy = 'no-referrer';
  const hint = node('p', '', 'hint');
  function update() {
    let valid = false; try { const u = new URL(url.value); valid = u.protocol === 'https:' && !u.username && !u.password; } catch { valid = /^assets\/[a-zA-Z0-9_./-]+$/.test(url.value) && !url.value.split('/').includes('..'); }
    preview.hidden = !valid; if (valid) preview.src = url.value.startsWith('assets/') ? 'https://moonwhale-ko.github.io/-Arknights-Tool/' + url.value : url.value;
    hint.textContent = valid ? '미리보기 로딩 중' : 'HTTPS 이미지 주소 또는 사이트의 assets/ 경로를 입력하세요.';
  }
  preview.onload = () => { hint.textContent = '이미지를 불러왔습니다.'; }; preview.onerror = () => { hint.textContent = '이미지를 불러오지 못했습니다. 주소를 확인하세요.'; }; url.oninput = () => { state.dirty = true; update(); }; form.append(preview, hint); update();
  const actions = node('div', undefined, 'actions'), save = node('button', '변경 내용 확인', 'primary'); save.type = 'submit'; actions.append(save); form.append(actions);
  form.onsubmit = event => { event.preventDefault(); if (state.busy) return; const doc = structuredClone(state.files.images.doc); doc.items[id] = { ...item, name: name.value.trim(), url: url.value.trim() }; review([{ key: 'images', doc }], item.name + ' 이미지 수정', { 이전: item, 변경: doc.items[id] }); };
}
function review(changes, description, preview) {
  if (!changes.length) return status('변경한 내용이 없습니다.');
  state.pending = changes; $('reviewDescription').textContent = description; $('reviewText').textContent = JSON.stringify(preview, null, 2); $('review').showModal();
}
async function save() {
  const changes = state.pending || []; if (!changes.length) return;
  $('review').close();
  await task(async () => {
    const result = await api('/api/save', 'POST', { changes: changes.map(({ key, doc }) => ({ key, doc, sha: state.files[key].sha })) });
    for (const { key, doc } of changes) state.files[key] = { doc, sha: result.revisions[key] };
    const future = changes.some(x => x.key === 'future'); state.pending = null; state.dirty = false;
    status(future ? '설정을 저장했습니다. 오퍼레이터 데이터 갱신이 자동으로 시작됩니다. 데이터 갱신 탭에서 결과를 확인하세요.' : '변경을 저장했습니다. 사이트 배포가 완료되면 적용됩니다.');
    renderOperators(); renderImages();
    if (state.selected) { state.selected = candidates().find(x => x.id === state.selected.id); editOperator(state.selected); }
    if (state.image) editImage(state.image);
  });
}
async function runs() {
  const data = await api('/api/runs'); const list = $('runs'); list.replaceChildren();
  const labels = { completed: '완료', queued: '대기 중', in_progress: '진행 중', success: '성공', failure: '실패', cancelled: '취소', action_required: '확인 필요' };
  for (const run of data.runs) { const a = node('a', undefined, 'run'); a.href = run.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    const title = node('span'); title.append(node('b', run.name), node('small', new Date(run.createdAt).toLocaleString('ko-KR')));
    a.append(title, node('em', labels[run.conclusion || run.status] || run.conclusion || run.status)); list.append(a); }
  if (!data.runs.length) list.append(node('p', '아직 실행 기록이 없습니다.', 'empty'));
}
document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => {
  if (state.busy || !discard()) return; state.dirty = false;
  if (state.selected) editOperator(state.selected); if (state.image) editImage(state.image);
  document.querySelectorAll('[data-tab]').forEach(x => x.removeAttribute('aria-current')); b.setAttribute('aria-current', 'page');
  for (const id of ['operators', 'images', 'updates', 'account', 'mining', 'orundum', 'preview']) $(id).hidden = b.dataset.tab !== id;
  if (b.dataset.tab === 'updates') task(runs);
});
$('operatorSearch').oninput = renderOperators; $('operatorFilter').onchange = renderOperators; $('imageSearch').oninput = renderImages;
$('loadCatalog').onclick = () => task(async () => { const data = await api('/api/files/catalog'); state.catalog = data.doc; $('operatorSearch').value = ''; $('operatorFilter').value = 'new'; renderOperators(); status('신규 목록을 확인했습니다. 목록에 없는 최신 캐릭터는 데이터 갱신 후 확인할 수 있습니다.'); });
$('refreshData').onclick = () => task(async () => { if (!discard()) return; await api('/api/refresh', 'POST', {}); status('최신 데이터 가져오기를 요청했습니다. 실행 기록이 표시되기까지 잠시 걸릴 수 있습니다.'); await runs(); });
$('reloadRuns').onclick = () => task(runs);
$('logout').onclick = () => task(async () => { if (!discard()) return; await api('/auth/logout', 'POST', {}); state.dirty = false; window.location.assign('/login'); });
for (const id of ['closeReview', 'cancelReview']) $(id).onclick = () => { $('review').close(); state.pending = null; };
$('review').onclick = event => { if (event.target !== $('review')) return; const r = $('review').getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) $('review').close(); };
$('confirmSave').onclick = save;
let theme; try { theme = localStorage.getItem('zootAdminTheme'); } catch {}
function setTheme(value) { document.documentElement.dataset.theme = value; $('theme').textContent = value === 'dark' ? '라이트 모드' : '다크 모드'; }
setTheme(theme === 'light' ? 'light' : 'dark');
$('theme').onclick = () => { const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; setTheme(next); try { localStorage.setItem('zootAdminTheme', next); } catch {} };
window.addEventListener('beforeunload', e => { if (state.dirty) { e.preventDefault(); e.returnValue = ''; } });
task(async () => {
  const session = await api('/api/session'); $('identity').textContent = session.login; $('workspace').hidden = false;
  const keys = ['operators', 'future', 'aliases', 'images'];
  const results = await Promise.allSettled(keys.map(async key => { state.files[key] = await api('/api/files/' + key); }));
  const failure = results.find(x => x.status === 'rejected'); if (failure) { document.querySelectorAll('[data-tab]').forEach(b => { if (b.dataset.tab === 'account') b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); }); for (const id of ['operators','images','updates','account','mining','orundum','preview']) $(id).hidden = id !== 'account'; throw failure.reason; }
  $('sourceDate').textContent = new Date(state.files.operators.doc.source.updatedAt).toLocaleDateString('ko-KR');
  $('workspace').hidden = false; renderOperators(); renderImages(); status('관리자 인증이 완료되었습니다. 수정할 항목을 선택하세요.');
});

// Private account data lives only in this page's memory. It is never part of a CMS save.
let rawSnapshot = null;
function clearRawAccount() {
  rawSnapshot = null; window.dispatchEvent(new Event('orundum-clear')); window.dispatchEvent(new Event('mining-clear')); $('rawPreview').textContent = ''; $('rawSummary').textContent = '';
  $('rawSection').replaceChildren(); $('rawResult').hidden = true; $('rawCode').value = '';
}
function renderRawSection() {
  if (!rawSnapshot) return;
  const selected = $('rawSection').value;
  let data = rawSnapshot.snapshot;
  if (selected.startsWith('root:')) data = data[selected.slice(5)];
  else if (selected.startsWith('user:')) data = data.user?.[selected.slice(5)];
  const text = JSON.stringify(data, null, 2) ?? 'null';
  $('rawPreview').textContent = text.length > 80000 ? text.slice(0, 80000) + '\n… 화면 표시만 생략되었습니다. 원본 JSON 다운로드에는 전체 데이터가 포함됩니다.' : text;
}
$('rawSendCode').onclick = () => task(async () => {
  if (!$('rawEmail').reportValidity()) return;
  await api('/api/account/send-code', 'POST', { server: 'kr', email: $('rawEmail').value.trim() });
  status('인증 메일을 보냈습니다. 받은 인증번호를 아래에 입력하세요.');
});
$('rawAccountForm').onsubmit = event => {
  event.preventDefault();
  task(async () => {
    if (!$('rawAccountForm').reportValidity()) return;
    const body = { server: 'kr', email: $('rawEmail').value.trim(), code: $('rawCode').value.trim() };
    $('rawCode').value = ''; clearRawAccount(); status('계정 동기화 원본을 가져오는 중입니다.');
    const data = await api('/api/account/sync', 'POST', body);
    rawSnapshot = { version: 1, importedAt: data.importedAt, server: data.server, source: data.source, snapshot: data.snapshot, supplementary: data.supplementary };
    const selector = $('rawSection');
    selector.append(new Option('전체 동기화 응답', 'all'));
    for (const k of Object.keys(data.snapshot)) selector.append(new Option(k + ' (응답 최상위)', 'root:' + k));
    for (const k of Object.keys(data.snapshot.user || {})) selector.append(new Option('user.' + k, 'user:' + k));
    $('rawSummary').textContent = new Date(data.importedAt).toLocaleString('ko-KR') + ' 조회 · user 항목 ' + Object.keys(data.snapshot.user || {}).length + '개';
    $('rawResult').hidden = false; renderRawSection(); status('전체 동기화 응답을 가져왔습니다. 항목을 선택하거나 원본 JSON을 내려받으세요.');
  });
};
$('rawSection').onchange = renderRawSection;
$('rawClear').onclick = () => { clearRawAccount(); status('계정 원본 데이터를 화면과 메모리에서 지웠습니다.'); };
$('rawDownload').onclick = () => {
  if (!rawSnapshot) return;
  const blob = new Blob([JSON.stringify(rawSnapshot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = 'arknights-private-sync-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};

window.addEventListener('mining-request-account', () => window.dispatchEvent(new CustomEvent('mining-account', { detail: rawSnapshot })));

window.addEventListener('orundum-request-account', () => window.dispatchEvent(new CustomEvent('orundum-account', { detail: rawSnapshot })));

window.addEventListener('message',event=>{const frame=$('previewFrame');if(event.origin!==location.origin||event.source!==frame.contentWindow||event.data?.type!=='preview-account-request')return;frame.contentWindow.postMessage({type:'preview-account',account:rawSnapshot},location.origin);});

for(const type of ['mining-clear','orundum-clear'])window.addEventListener(type,()=>{const f=$('previewFrame');if(f?.contentWindow)f.contentWindow.postMessage({type:'preview-clear'},location.origin);});
