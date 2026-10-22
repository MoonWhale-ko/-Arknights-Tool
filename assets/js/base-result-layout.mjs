const facilityOrder=['CONTROL','MEETING','MANUFACTURE','TRADING','POWER','HIRE','WORKSHOP','TRAINING'];
export function orderFacilities(rooms){return [...rooms].sort((a,b)=>facilityOrder.indexOf(a.type)-facilityOrder.indexOf(b.type));}
export function orderDorms(rooms,recovery=[]){
 const rates=new Map(recovery.map(r=>[r.id,r.rate]));
 return [...rooms].sort((a,b)=>(rates.get(b.id)??-1)-(rates.get(a.id)??-1));
}
// Compare every dorm using the same ordinary, exhausted resting occupants in free beds.
// Recovery still comes from the actual skill evaluator, including fixed supporters and links.
export function describeDormRecovery(model,plan){
 const supports=plan.dormSupport??model.input.dormSupport,probes=[],dorms=model.rooms.filter(r=>r.type==='DORMITORY');
 const placements=dorms.map(room=>{
  const ops=(supports[room.id]??[]).map(id=>model.byId[id]);
  while(ops.length<room.capacity){const id='recovery_'+room.id+'_'+ops.length,op={id,name:'휴식 인원',maxMorale:24,rarity:0,elite:0,skills:[],terra:{id,name:'휴식 인원',rarity:0,elite:0,skills:[],factions:[],race:'',subProfession:''}};ops.push(op);probes.push(op);}
  return {room,ops};
 });
 const sums=new Map(dorms.map(r=>[r.id,0])),pool=[...model.pool,...probes];
 for(let team=0;team<model.input.options.teams;team++){
  const work=model.work.map(room=>({room,ops:(plan.groups.find(g=>g.team===team&&g.room===room.id)?.operators??[]).map(id=>model.byId[id])}));
  const morale=Object.fromEntries(pool.map(o=>[o.id,probes.includes(o)?0:o.maxMorale]));
  const snapshot=model.snapshotEvaluator({...model,pool},[...work,...placements],morale,Object.fromEntries(pool.map(o=>[o.id,0])));
  for(const p of placements){const guests=p.ops.filter(o=>probes.includes(o));const average=guests.length?guests.reduce((n,o)=>n+snapshot.rates[o.id],0)/guests.length:0;sums.set(p.room.id,sums.get(p.room.id)+average/model.input.options.teams);}
 }
 return dorms.map(r=>({id:r.id,rate:sums.get(r.id),freeBeds:r.capacity-(supports[r.id]?.length??0)}));
}
