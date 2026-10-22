import {simulate} from './infra-v2-core.mjs?v=5';
export function isSelfOnlyDormSupport(op){
 const skills=op?.skills.filter(s=>s.room==='DORMITORY')??[];
 return skills.length>0&&skills.every(s=>['selfRest','fixedRest'].includes(s.kind)&&!s.linked);
}
// Non-stacking recovery families are per dorm, not per skill name or operator.
export function dormSupportAllowed(ops){
 const used=new Set();
 for(const op of ops){
  const groups=new Set();
  for(const s of op.skills.filter(s=>s.room==='DORMITORY')){
   const id=(s.terra?.buffId??s.id).split('[')[0];let group=null;
   if(id==='dorm_rec_all&single')group='all-single';
   else if(['allRest','selfAllRest'].includes(s.kind)||id.startsWith('dorm_rec_all')||['dorm_rec_oneself2','dorm_powToRecAll','dorm_hireToRecAll','dorm_rec_bd_n1_n2'].includes(id))group='all';
   else if(['singleRest','selfSingleRest'].includes(s.kind)||id.startsWith('dorm_rec_single')||id==='dorm_rec_bd_n1_n3')group='single';
   else if(s.kind==='exchange')group='exchange';
   if(group)groups.add(group);
  }
  for(const group of groups){if(used.has(group))return false;used.add(group);}
 }
 return true;
}
// Self recovery remains available to resting workers, but never reserves a support bed.
export function trimDormSupport(model,plan){
 const dormSupport=Object.fromEntries(Object.entries(plan.dormSupport??{}).map(([room,ids])=>[room,ids.filter(id=>!isSelfOnlyDormSupport(model.byId[id]))]));
 const cleaned={...plan,...(plan.dormSupport?{dormSupport}:{})};
 return {plan:cleaned,result:simulate(model,cleaned,{record:true})};
}
