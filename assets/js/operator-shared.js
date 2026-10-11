// Forms keep independent ownership, mastery and modules; these fields belong to one operator.
window.ArknightsShared=(()=>{
 const keys=['elite','level','potential','trust','skill'];
 const members=(chars,id)=>{const c=chars.find(c=>c.id===id);return c?.sharedGroup?chars.filter(o=>o.sharedGroup===c.sharedGroup):[]};
 const copy=(to,from)=>{for(const key of keys)if(from[key]!==undefined)to[key]=from[key];return to};
 function sync(chars,state,id,defaults){
  for(const c of members(chars,id))if(c.id!==id){state[c.id]=copy({...defaults(),...state[c.id]},state[id]);}
 }
 function migrate(chars,state,defaults){
  const before=JSON.stringify(state);
  for(const base of chars.filter(c=>c.sharedGroup===c.id)){
   const saved=state[base.id];
   if(!saved)continue;
   for(const c of members(chars,base.id)){
    const raw=saved.classVariants?.[c.id];
    if(raw&&!state[c.id])state[c.id]={...defaults(),owned:true,m:c.skills.map(s=>raw.skills.find(v=>v.id===s.id)?.mastery||0),mods:{...raw.modules}};
   }
   sync(chars,state,base.id,defaults);
  }
  return before!==JSON.stringify(state);
 }
 return {keys,members,copy,sync,migrate};
})();
