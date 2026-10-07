const integer=(v,min,max)=>Math.min(max,Math.max(min,Number.isFinite(+v)?Math.trunc(+v):min));
export function progress(operator,value={}){
 const elite=integer(value.elite,0,operator.phases.length-1);
 return {owned:!!value.owned,elite,level:integer(value.level,1,operator.phases[elite].maxLevel),
  potential:integer(value.potential??1,1,(operator.maxPotentialLevel??5)+1),
  trust:integer(value.trust,0,200),skill:integer(value.skill??1,1,elite?7:4),
  m:operator.skills.map((_,i)=>integer(value.m?.[i],0,3)),mods:{...value.mods}};
}
const stage=(s,m)=>integer(s.mods[m.id]??s.mods[m.type],0,3);
export function calculateGrowth(operator,currentValue,targetValue,data){
 const current=currentValue?.owned?progress(operator,currentValue):progress(operator);
 const goal=progress(operator,targetValue),steps=[],notes=[];
 const add=(label,cost)=>{if(cost.length)steps.push({label,cost})};
 if(!goal.owned)return {operator,current,goal,steps,notes,totals:{}};
 // A saved target can lag behind the user's actual progress. Never charge completed work.
 if(current.owned){goal.elite=Math.max(goal.elite,current.elite);if(goal.elite===current.elite)goal.level=Math.max(goal.level,current.level);goal.skill=Math.max(goal.skill,current.skill);}
 if(!current.owned)notes.push('미보유 오퍼레이터 획득 필요 · 모집 비용은 합산하지 않습니다.');
 for(let e=current.elite;e<=goal.elite;e++){
  const from=e===current.elite?current.level:1,to=e===goal.elite?goal.level:operator.phases[e].maxLevel;
  let exp=0,gold=0;
  for(let level=from;level<to;level++){
   const xp=data.levelExp[e]?.[level-1],lmd=data.levelGold[e]?.[level-1];
   if(!(xp>=0&&lmd>=0))throw Error('레벨 비용 데이터가 없습니다.');
   exp+=xp;gold+=lmd;
  }
  add(`E${e} Lv.${from} → ${to}`,[...(exp?[{id:'exp',count:exp}]:[]),...(gold?[{id:'4001',count:gold}]:[])]);
  if(e<goal.elite)add(`E${e+1} 정예화`,operator.phases[e+1].evolveCost);
 }
 for(const s of operator.skillLevels)if(s.from>=current.skill&&s.to<=goal.skill)add(`스킬 Lv.${s.from} → ${s.to}`,s.cost);
 operator.skills.forEach((s,i)=>{if(goal.elite!==2||goal.skill<7)return;for(const m of s.mastery)if(m.level>current.m[i]&&m.level<=goal.m[i])add(`S${s.index} · M${m.level}`,m.cost)});
 for(const m of operator.modules){
  const before=stage(current,m),after=stage(goal,m);
  for(const s of m.costs)if(s.stage>before&&s.stage<=after)add(`모듈 ${m.type==='D'?'Δ':m.type} · Stage ${s.stage}`,s.cost);
  if(!before&&after){notes.push(`모듈 ${m.type==='D'?'Δ':m.type} 해금: E2 Lv.${m.unlockLevel}, 신뢰도 조건 및 해금 임무 완료 필요.`);for(const task of m.missions||[])notes.push(task.description)}
 }
 if(goal.potential>current.potential)notes.push(`잠재 ${current.potential} → ${goal.potential}: 추가 ${goal.potential-current.potential}단계 · 전용 증표 또는 해당 등급·직군의 잠재 상승 재화 필요. 일반 육성 재료 합계에는 포함하지 않습니다.`);
 if(goal.trust>current.trust)notes.push(`신뢰도 ${current.trust}% → ${goal.trust}%: 전투·기지 활동으로 상승하며 재료 합계에는 포함하지 않습니다.`);
 const totals={};for(const step of steps)for(const x of step.cost)totals[x.id]=(totals[x.id]||0)+x.count;
 return {operator,current,goal,steps,notes,totals};
}
export function calculatePlans(operators,current,plans,data){
 const results=operators.filter(o=>Object.hasOwn(plans,o.id)).map(o=>calculateGrowth(o,current[o.id],plans[o.id],data)).filter(r=>r.steps.length||r.notes.length);
 const totals={};for(const r of results)for(const [id,count] of Object.entries(r.totals))totals[id]=(totals[id]||0)+count;
 return {results,totals};
}
export function ownedAmount(id,inventory,data){
 const count=k=>Number.isSafeInteger(inventory.items[k])&&inventory.items[k]>=0?inventory.items[k]:0;
 return id==='exp'?Object.entries(data.expItems).reduce((sum,[key,exp])=>sum+count(key)*exp,0):count(id);
}
export function recipeCapacity(recipe,inventory,totals,data){
 // Reserve materials directly needed by these plans before calculating spare ingredients.
 const cost={};for(const x of recipe.cost)cost[x.id]=(cost[x.id]||0)+x.count;
 if(recipe.goldCost)cost['4001']=(cost['4001']||0)+recipe.goldCost;
 const runs=Math.min(...Object.entries(cost).map(([id,n])=>Math.floor(Math.max(0,ownedAmount(id,inventory,data)-(totals[id]||0))/n)));
 return Math.max(0,Number.isFinite(runs)?runs:0)*recipe.count;
}
