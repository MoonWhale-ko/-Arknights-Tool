// Client enum reference: AdoreJc/ArknightsDB 95ce0f0823f233389fa97e0d7fc9d1759e58464e, Torappu/PlayerSixStarTagFinishState.md.
// Positive completion evidence is kept separate from the user's missing-record assumption.
export function stageEvidence(catalog, user, now=Date.now()/1000) {
  const records=user.dungeon.stages, bounds=new Map(), graph=catalog.graph||{};
  const get=id=>{if(!bounds.has(id))bounds.set(id,{lo:0,hi:3,reason:''});return bounds.get(id);};
  const raise=(id,state,reason)=>{const b=get(id);if(b.lo>=state)return false;b.lo=state;b.hi=Math.max(b.hi,state);b.reason=reason;return true;};
  for(const [id,record]of Object.entries(records)) {
    if([0,1,2,3].includes(record.state))bounds.set(id,{lo:record.state,hi:record.state,reason:'개별 기록'});
  }
  for(const rule of catalog.medals||[]) {
    const medal=user.medal?.medals?.[rule.id];
    if(medal?.val?.length===1 && medal.val[0]?.[0]>=rule.count && medal.val[0]?.[1]===rule.count)
      for(const id of rule.stages)raise(id,3,'전체 완료 훈장: '+rule.id);
  }
  for(const [id,stage]of Object.entries(user.dungeon.sixStar?.stages||{}))
    if(stage.tagFinish===1||stage.tagFinish===2)raise(id,3,'추가 별 달성 기록으로 완료 확인');
  // Finishing a harder environment grants the lower environment's completion too.
  // Completing a child proves only the exact PASS/COMPLETE rating required by its gate.
  let changed=true;
  while(changed){changed=false;
    for(const [higher,lower]of catalog.completionLinks||[])if(get(higher).lo>=3)changed=raise(lower,3,'상위 난이도 완료 연동: '+(graph[higher]?.code||higher))||changed;
    for(const [id,node]of Object.entries(graph))if(get(id).lo>=2)
      for(const p of node.requires||[]){const state=p.completeState==='COMPLETE'?3:p.completeState==='PASS'?2:0;if(state)changed=raise(p.stageId,state,'후속 '+(node.code||id)+'의 해금 조건으로 확인')||changed;}
  }
  changed=true;
  while(changed){changed=false;
    for(const [id,node]of Object.entries(graph)) {
      const b=get(id);if(b.lo>0||b.hi===0||Object.hasOwn(records,id))continue;
      const window=node.entryWindow, temporary=window&&window.start<=now&&now<window.end;
      const gate=temporary?window.requires:node.zoneRequires;
      if(gate&&get(gate).hi<2){b.hi=0;b.reason='에피소드 해금 조건: '+(graph[gate]?.code||gate)+' 미완료';changed=true;continue;}
      const blocked=(node.requires||[]).find(p=>{const req=p.completeState==='COMPLETE'?3:p.completeState==='PASS'?2:0;return req&&get(p.stageId).hi<req;});
      if(blocked){b.hi=0;b.reason='선행 '+(graph[blocked.stageId]?.code||blocked.stageId)+' 미완료 → 아직 해금되지 않음';changed=true;}
    }
  }
  return bounds;
}
export function simulationProgress(catalog,user) {
  return (catalog.simulation||[]).map(group=>{
    let derived=0,valid=true;
    for(const id of group.stages){const n=user.dungeon.sixStar?.stages?.[id]?.tagFinish??0;if(Number.isInteger(n)&&n>=0&&n<=2)derived+=n;else valid=false;}
    const stored=user.dungeon.sixStar?.groups?.[group.id]?.point;
    const recorded=Number.isInteger(stored)&&stored>=0;
    return {id:group.id,point:recorded?stored:valid?derived:null,derived:valid?derived:null,source:recorded?'계정 누적 포인트':'스테이지 추가 별 합계',mismatch:recorded&&valid&&stored!==derived};
  });
}
