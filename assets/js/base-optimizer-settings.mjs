// Manual dorm values belong to the facility snapshot they were edited against.
export function dormAmbienceSource(base){
 const dorms=Object.entries(base?.rooms??{}).filter(([,r])=>r.type==='DORMITORY'&&r.level>0).sort(([a],[b])=>a.localeCompare(b)).map(([id,r])=>[id,r.level,r.ambience??null]);
 return JSON.stringify([base?.source??'manual',base?.importedAt??null,dorms]);
}
export function resolveDormAmbience(base,saved={},savedSource){
 const useSaved=base?.source!=='account'||savedSource===dormAmbienceSource(base);
 return Object.fromEntries(Object.entries(base?.rooms??{}).filter(([,r])=>r.type==='DORMITORY'&&r.level>0).map(([id,r])=>[id,useSaved&&Object.hasOwn(saved??{},id)?saved[id]:r.ambience]));
}
