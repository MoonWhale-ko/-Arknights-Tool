import { stageEvidence, simulationProgress } from './evidence.mjs';
export function accountUser(data) {
  const user = data?.snapshot?.user ?? data?.user;
  if (!user?.dungeon?.stages || typeof user.dungeon.stages !== 'object' || Array.isArray(user.dungeon.stages)) throw new Error('계정 원본 JSON의 user.dungeon.stages를 찾을 수 없습니다.');
  return user;
}
export function audit(catalog, data, { now = Date.now() / 1000, overrides = {} } = {}) {
  const user = accountUser(data), records = user.dungeon.stages, evidence = stageEvidence(catalog,user);
  const simulation=simulationProgress(catalog,user), progress=new Map(simulation.map(g=>[g.id,g]));
  // KR resets at 04:00 KST. Calendar day in UTC+5 matches the game day.
  const weekday = new Date((now + 5 * 3600) * 1000).getUTCDay() || 7;
  const forced = new Set((catalog.forceOpen || []).filter(w => w.startTime <= now && now <= w.endTime).flatMap(w => w.forceOpenList));
  const included = [], excluded = [];
  const seen = new Set();
  for (const s of [...catalog.stages,...(catalog.milestones||[])]) {
    if (seen.has(s.id) || !(s.op > 0)) continue;
    seen.add(s.id);
    const availability = stageAvailability(s, now, weekday, forced);
    if (!availability.included) { excluded.push({ ...s, ...availability }); continue; }

    const record = records[s.id], bound=evidence.get(s.id);
    let status='remaining', reason='개별 기록 없음 · 미완료로 간주', assumed=!record, ready=false;
    if(s.idType==='milestone') {
      assumed=false;
      const point=progress.get(s.groupId)?.point, reward=user.dungeon.sixStar?.groups?.[s.groupId]?.rewards?.[s.id];
      if(reward?.state===2){status='claimed';reason='누적 보상 수령 완료';}
      else if(reward && ![0,1].includes(reward.state)){status='unknown';reason='알 수 없는 누적 보상 수령 상태';}
      else {ready=reward?.state===1 || Number.isFinite(point)&&point>=s.threshold;reason=ready?`${point} / ${s.threshold}P · 달성, 미수령`:`${point??'?'} / ${s.threshold}P · 추가 별 달성 필요`;}
    } else if (bound?.lo>=3) {status='claimed';reason=record?.state===3?'개별 완료 기록 (state 3)':bound.reason;}
    else if (record && [0,1,2].includes(record.state)) {reason=`개별 미완료 기록 (state ${record.state})`;}
    else if (record) {status='unknown';reason='알 수 없는 기록 상태';}
    else if(bound?.hi===0){reason=bound.reason;assumed=false;}
    else if(bound?.lo>=2){status='unknown';reason=bound.reason+' · 클리어는 확인되나 3성 여부 미확인';assumed=false;}
    if (['remaining','claimed'].includes(overrides[s.id])) { status = overrides[s.id]; reason = '직접 확인 · 이 화면에서만 적용'; }
    if (status !== 'remaining' || overrides[s.id]) assumed = false;
    const block = user.retro?.block?.[s.retroId];
    const graphNode=catalog.graph?.[s.id];
    const unmet=(graphNode?.requires||[]).some(p=>{const n=p.completeState==='COMPLETE'?3:2;return (evidence.get(p.stageId)?.lo??0)<n;});
    const gate=s.pointGate,gateMissing=gate&&(progress.get(gate.group)?.point??0)<gate.point;
    const access=s.idType==='milestone'?(ready?'수령 가능':'추가 별 달성 필요'):block?.locked===1?'콘텐츠 해금 필요':gateMissing?`누적 ${gate.point}P 필요`:unmet?'선행 스테이지 진행 필요':'개방 중';
    included.push({ ...s, status, reason, assumed, access, availability: availability.label, ready });
  }
  return { included, excluded, simulation, calculatedAt: new Date(now * 1000).toISOString() };
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
