import {simulate} from './infra-v2-core.mjs?v=4';
export function isSelfOnlyDormSupport(op){
 const skills=op?.skills.filter(s=>s.room==='DORMITORY')??[];
 return skills.length>0&&skills.every(s=>['selfRest','fixedRest'].includes(s.kind)&&!s.linked);
}
// Self recovery remains available to resting workers, but never reserves a support bed.
export function trimDormSupport(model,plan){
 const dormSupport=Object.fromEntries(Object.entries(plan.dormSupport??{}).map(([room,ids])=>[room,ids.filter(id=>!isSelfOnlyDormSupport(model.byId[id]))]));
 const cleaned={...plan,...(plan.dormSupport?{dormSupport}:{})};
 return {plan:cleaned,result:simulate(model,cleaned,{record:true})};
}
