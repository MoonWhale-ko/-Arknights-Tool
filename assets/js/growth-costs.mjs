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
 const token=data.potentials[operator.id],potential=Math.max(0,goal.potential-current.potential);
 const tokenCount=potential+(token?.activity&&!current.owned?1:0);
 if(tokenCount){
  if(token)add(`${token.activity&&!current.owned?'획득 및 ':''}잠재 ${current.potential} → ${goal.potential}`,[{id:token.id,count:tokenCount}]);
  else notes.push(`잠재 ${current.potential} → ${goal.potential}: 추가 ${potential}단계 · 전용 증표 정보가 없습니다.`);
 }
 if(goal.trust>current.trust)notes.push(`신뢰도 ${current.trust}% → ${goal.trust}%: 전투·기지 활동으로 상승하며 재료 합계에는 포함하지 않습니다.`);
 const totals={};for(const step of steps)for(const x of step.cost)totals[x.id]=(totals[x.id]||0)+x.count;
 return {operator,current,goal,steps,notes,totals};
}
export function calculatePlans(operators,current,plans,data){
 const results=operators.filter(o=>Object.hasOwn(plans,o.id)).map(o=>calculateGrowth(o,current[o.id],plans[o.id],data)).filter(r=>r.steps.length||r.notes.length);
 const totals={};for(const r of results)for(const [id,count] of Object.entries(r.totals))totals[id]=(totals[id]||0)+count;
 return {results,totals};
}
// Counts reflect the selected operators' remaining direct growth costs.
export function materialUsers(results,id){
 return results.filter(r=>r.totals[id]>0).map(r=>({id:r.operator.id,name:r.operator.name,count:r.totals[id]})).sort((a,b)=>a.name.localeCompare(b.name,'ko'));
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

// Simulate one material's shortage independently; never mutate the saved bag.
// Stock reserved for direct growth costs cannot also be consumed by crafting.
export function craftingPlan(recipe,quantity,inventory,totals,data){
 const stock=Object.fromEntries(Object.keys(inventory.items).map(id=>[id,Math.max(0,ownedAmount(id,inventory,data)-(totals[id]||0))]));
 const bagStock={...stock},steps=[],missing={},used={};
 const take=(id,count)=>{
  const n=Math.min(stock[id]||0,count);stock[id]=(stock[id]||0)-n;
  const fromBag=Math.min(bagStock[id]||0,n);
  bagStock[id]=(bagStock[id]||0)-fromBag;
  if(fromBag)used[id]=(used[id]||0)+fromBag;
  return count-n;
 };
 const need=(id,count,path)=>{
  const remaining=take(id,count);if(!remaining)return;
  const next=(data.recipes[id]||[])[0];
  if(!next||path.has(id)){missing[id]=(missing[id]||0)+remaining;return}
  craft(next,remaining,new Set([...path,id]));
 };
 const craft=(r,count,path)=>{
  const runs=Math.ceil(count/r.count),cost={};
  for(const x of r.cost)cost[x.id]=(cost[x.id]||0)+x.count*runs;
  if(r.goldCost)cost['4001']=(cost['4001']||0)+r.goldCost*runs;
  for(const [id,n] of Object.entries(cost))need(id,n,path);
  const output=r.count*runs;
  stock[r.itemId]=(stock[r.itemId]||0)+output-count;
  steps.push({recipe:r,runs,cost,output});
 };
 if(quantity>0)craft(recipe,quantity,new Set([recipe.itemId]));
 return {steps,used,missing,possible:Object.keys(missing).length===0};
}

// Allocate shared bag stock once, reserving direct costs before expanding shortages.
export function materialRequirements(totals,inventory,data){
 const stock=Object.fromEntries(Object.keys(inventory.items).map(id=>[id,ownedAmount(id,inventory,data)]));
 stock.exp=ownedAmount('exp',inventory,data);
 const take=(id,count)=>{const used=Math.min(stock[id]||0,count);stock[id]=(stock[id]||0)-used;return used};
 const roots=Object.entries(totals).filter(([,count])=>count>0).map(([id,count])=>({id,count,displayOwned:ownedAmount(id,inventory,data),owned:take(id,count),children:[]}));
 const rows={};
 const expand=(node,path)=>{
  node.short=node.count-node.owned;
  const row=rows[node.id]??={id:node.id,count:0,owned:0};row.count+=node.count;row.owned+=node.owned;
  const recipe=(data.recipes[node.id]||[])[0];
  if(!node.short||!recipe||path.has(node.id))return;
  node.recipe=recipe;node.runs=Math.ceil(node.short/recipe.count);
  const cost={};for(const x of recipe.cost)cost[x.id]=(cost[x.id]||0)+x.count*node.runs;
  if(recipe.goldCost)cost['4001']=(cost['4001']||0)+recipe.goldCost*node.runs;
  for(const [id,count] of Object.entries(cost)){
   const child={id,count,owned:take(id,count),children:[]};node.children.push(child);expand(child,new Set([...path,node.id]));
  }
  stock[node.id]=(stock[node.id]||0)+recipe.count*node.runs-node.short;
 };
 for(const root of roots)expand(root,new Set());
 const missing=Object.values(rows).filter(r=>!(data.recipes[r.id]||[]).length&&r.count>r.owned);
 return {roots,rows:Object.values(rows),missing};
}
