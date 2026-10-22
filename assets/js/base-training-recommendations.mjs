import {K,kt} from './infra-v2-terra-engine.mjs';
export function trainingRecommendations(report,current){
 const rooms=new Map(report.rooms.map(r=>[r.id,r.type])),roles=new Map();
 const add=(id,room)=>{if(!roles.has(id))roles.set(id,new Set());roles.get(id).add(rooms.get(room));};
 for(const g of report.best?.plan.groups??[])for(const id of g.operators)add(id,g.room);
 for(const [room,ids] of Object.entries(report.best?.plan.dormSupport??{}))for(const id of ids)add(id,room);
 return [...roles].flatMap(([id,types])=>{const before=current[id],target=report.input.progress[id];if(!before||!target||before.elite===target.elite&&before.level===target.level)return [];
  const definition=K.get(id);let goal={elite:target.elite,level:target.level},skills=[];
  if(definition){
   const old=kt(definition,before.elite,before.level).skills,newSkills=kt(definition,target.elite,target.level).skills;
   skills=newSkills.filter(s=>types.has(s.room)&&!old.some(previous=>previous.buffId===s.buffId));
   if(!skills.length&&(!types.has('MEETING')||before.elite===target.elite))return [];
   const elite=Math.max(before.elite,types.has('MEETING')?target.elite:before.elite,...skills.map(s=>Number(s.unlock.match(/정예화\s*(\d+)/)?.[1]??0)));
   const level=Math.max(1,...skills.filter(s=>Number(s.unlock.match(/정예화\s*(\d+)/)?.[1]??0)===elite).map(s=>Number(s.unlock.match(/Lv\.\s*(\d+)/)?.[1]??1)));
   goal={elite,level:elite===before.elite?Math.max(before.level,level):level};
  }
  return [{id,current:{elite:before.elite,level:before.level},target:goal,maximum:{elite:target.elite,level:target.level},skills:skills.map(s=>s.name),roles:[...types]}];});
}
