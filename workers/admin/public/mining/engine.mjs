export function accountUser(data) {
  const user = data?.snapshot?.user ?? data?.user;
  if (!user?.dungeon?.stages || typeof user.dungeon.stages !== 'object' || Array.isArray(user.dungeon.stages)) throw new Error('계정 원본 JSON의 user.dungeon.stages를 찾을 수 없습니다.');
  return user;
}
export function calculate(catalog, data, { now = Date.now() / 1000, overrides = {} } = {}) {
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
  return catalog.stages.filter(s => (!s.start || s.start <= now) && (!s.end || s.end < 0 || s.end >= now)
    && (!s.weekdays || s.weekdays.includes(weekday) || forced.has(s.zone))).map(s => {
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
    return { ...s, status, reason, assumed, access };
  });
}
export function totals(rows) {
  return rows.reduce((a,s) => { a[s.status] += s.op; a.total += s.op; return a; }, {remaining:0,claimed:0,unknown:0,total:0});
}
