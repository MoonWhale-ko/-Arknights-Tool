export function accountUser(data) {
  const user = data?.snapshot?.user ?? data?.user;
  if (!user?.dungeon?.stages || typeof user.dungeon.stages !== 'object' || Array.isArray(user.dungeon.stages)) throw new Error('계정 원본 JSON의 user.dungeon.stages를 찾을 수 없습니다.');
  return user;
}
export function audit(catalog, data, { now = Date.now() / 1000, overrides = {} } = {}) {
  const user = accountUser(data), records = user.dungeon.stages, evidence = new Map();
  for (const rule of catalog.medals) {
    const medal = user.medal?.medals?.[rule.id];
    // Partial aggregate counts cannot identify which stages were cleared.
    if (medal?.val?.length === 1 && medal.val[0]?.[0] >= rule.count && medal.val[0]?.[1] === rule.count)
      for (const id of rule.stages) evidence.set(id, rule.id);
  }
  // KR resets at 04:00 KST. Calendar day in UTC+5 matches the game day.
  const weekday = new Date((now + 5 * 3600) * 1000).getUTCDay() || 7;
  const forced = new Set((catalog.forceOpen || []).filter(w => w.startTime <= now && now <= w.endTime).flatMap(w => w.forceOpenList));
  const included = [], excluded = [];
  const seen = new Set();
  for (const s of catalog.stages) {
    if (seen.has(s.id) || !(s.op > 0)) continue;
    seen.add(s.id);
    const availability = stageAvailability(s, now, weekday, forced);
    if (!availability.included) { excluded.push({ ...s, ...availability }); continue; }

    const record = records[s.id];
    let status = 'remaining', reason = '개별 기록 없음 · 미완료로 간주', assumed = !record;
    if (record?.state === 3) { status = 'claimed'; reason = '개별 완료 기록 (state 3)'; }
    else if (evidence.has(s.id)) { status = 'claimed'; reason = '전체 스테이지 완료 훈장: ' + evidence.get(s.id); }
    else if (record && [0,1,2].includes(record.state)) { reason = `개별 미완료 기록 (state ${record.state})`; }
    else if (record) { status = 'unknown'; reason = '알 수 없는 기록 상태'; }
    if (['remaining','claimed'].includes(overrides[s.id])) { status = overrides[s.id]; reason = '직접 확인 · 이 화면에서만 적용'; }
    if (status !== 'remaining' || overrides[s.id]) assumed = false;
    const block = user.retro?.block?.[s.retroId];
    const access = block?.locked === 1 ? '콘텐츠 해금 필요' : '개방 중 · 선행 조건 별도';
    included.push({ ...s, status, reason, assumed, access, availability: availability.label });
  }
  return { included, excluded, calculatedAt: new Date(now * 1000).toISOString() };
}
export function calculate(catalog, data, options = {}) { return audit(catalog, data, options).included; }
export function stageAvailability(stage, now, weekday, forced = new Set()) {
  const routes = stage.routes || [{ type: stage.category === 'event' ? 'event' : 'permanent', start: stage.start, end: stage.end }];
  const valid = routes.filter(r => Number.isFinite(r.start) && Number.isFinite(r.end)
    && (r.type === 'permanent' || r.type === 'event' && r.end > r.start));
  const active = valid.filter(r => r.start <= now && (r.end < 0 || now < r.end));
  if (active.length) {
    if (stage.weekdays && !stage.weekdays.includes(weekday) && !forced.has(stage.zone))
      return { included:false, label:'요일 미개방', exclusion:'요일 미개방', detail:'오늘은 개방 요일이 아닙니다. 다음 개방일까지 합계에서 제외합니다.' };
    return { included:true, label:active.some(r=>r.type==='permanent') ? '상시 개방' : '이벤트 개방 중' };
  }
  const future = valid.filter(r=>r.start>now).sort((a,b)=>a.start-b.start)[0];
  if (future) return { included:false, exclusion:'개방 예정', detail:'개방 예정: '+new Date(future.start*1000).toISOString(), opensAt:future.start };
  if (stage.availabilityHint) return { included:false, exclusion:stage.availabilityHint, detail:stage.hintNote || '현재 전투 기간 종료 · 상시 입장 경로 없음', source:stage.hintSource };
  if (valid.length) return { included:false, exclusion:'기간 종료', detail:'전투 기간 종료 · 현재 상시 입장 경로 없음' };
  return { included:false, exclusion:'개방 정보 부족', detail:'입장 가능 기간을 확인할 수 없어 제외합니다.' };
}
export function totals(rows) {
  return rows.reduce((a,s) => { a[s.status] += s.op; a.total += s.op; return a; }, {remaining:0,claimed:0,unknown:0,total:0});
}
