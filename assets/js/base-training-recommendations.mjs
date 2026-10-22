export function trainingRecommendations(report,current,goals={}){
 const rooms=new Map(report.rooms.map(r=>[r.id,r.type])),roles=new Map();
 const add=(id,room)=>{if(!roles.has(id))roles.set(id,new Set());roles.get(id).add(rooms.get(room));};
 for(const g of report.best?.plan.groups??[])for(const id of g.operators)add(id,g.room);
 for(const [room,ids] of Object.entries(report.best?.plan.dormSupport??{}))for(const id of ids)add(id,room);
 return [...roles].flatMap(([id,types])=>{const before=current[id],goal=goals[id];if(!before||!goal)return [];
  return [{id,current:{elite:before.elite,level:before.level},target:{...goal.target},skills:goal.skills.map(s=>s.name),roles:[...types]}];});
}
