import {simulate,score,compare} from './infra-v2-core.mjs?v=4';
const selfOnly=op=>{
 const skills=op?.skills.filter(s=>s.room==='DORMITORY')??[];
 return skills.length>0&&skills.every(s=>['selfRest','fixedRest'].includes(s.kind)&&!s.linked);
};
// Keep occupancy-based production links, but do not reserve a bed merely for self recovery.
export function trimDormSupport(model,plan,result=simulate(model,plan,{record:true})){
 let bestPlan=plan,bestResult=result,bestScore=score(model,result);
 if(!bestScore)return {plan:bestPlan,result:bestResult};
 for(const [room,ids] of Object.entries(plan.dormSupport??{}))for(const id of ids){
  if(!selfOnly(model.byId[id])||(model.input.dormSupport[room]??[]).includes(id))continue;
  const trial={...bestPlan,dormSupport:{...bestPlan.dormSupport,[room]:bestPlan.dormSupport[room].filter(x=>x!==id)}};
  const tested=simulate(model,trial,{record:true}),value=score(model,tested);
  if(value&&compare(value,bestScore)>=0){bestPlan=trial;bestResult=tested;bestScore=value;}
 }
 return {plan:bestPlan,result:bestResult};
}
