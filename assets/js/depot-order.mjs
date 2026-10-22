// sortId is the game's display order; negative values denote items absent from the depot.
export function compareDepotItems(a,b,sortIds){
 const rank=item=>Number.isFinite(sortIds[item.id])&&sortIds[item.id]>=0?sortIds[item.id]:Number.MAX_SAFE_INTEGER;
 return rank(a)-rank(b)||a.id.localeCompare(b.id,'en',{numeric:true});
}
