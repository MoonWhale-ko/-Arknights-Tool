// Public, allowlisted computation data only. Never serialize account responses.
export const ENGINE='base-v1';
const id=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(x);
const integer=(x,a,b)=>Number.isInteger(x)&&x>=a&&x<=b;
const keys=(x,allowed)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).every(k=>allowed.includes(k));
export function makeSubmission(data,base,progress,products,options,result,conditionsOnly=false){
 const rooms=Object.fromEntries(Object.entries(base.rooms).filter(([,r])=>['MANUFACTURE','TRADING','POWER','CONTROL','HIRE','DORMITORY','TRAINING','MEETING','WORKSHOP','PRIVATE'].includes(r.type)).map(([key,r])=>[key,{type:r.type,level:r.level,...(Number.isFinite(r.ambience)?{ambience:r.ambience}:{})}]));
 const owned=Object.fromEntries(Object.entries(progress).filter(([key,s])=>s.owned&&data.characters[key]).sort(([a],[b])=>a.localeCompare(b)).map(([key,s])=>[key,{owned:true,elite:Number(s.elite)||0,level:Number(s.level)||1}]));
 const pool=result.pool.map(o=>o.id),ref=i=>pool[i];
 const payload={version:1,engine:ENGINE,source:data.source.blob,base:{rooms},progress:owned,products:Object.fromEntries(Object.entries(products).filter(([k])=>rooms[k]).map(([k,v])=>[k,String(v)])),options:{teams:options.teams,rotation:options.rotation,extraActions:options.extraActions,priority:[...options.priority],...(Array.isArray(options.missingClues)?{missingClues:[...options.missingClues]}:{}),ambience:Object.fromEntries(Object.entries(options.ambience).filter(([k,v])=>rooms[k]&&Number.isFinite(v)))},plan:{rooms:result.plan.rooms.map(r=>r.id),teams:result.plan.teams.map(t=>t.map(r=>r.map(ref))),residents:result.plan.residents.map(ref),support:result.plan.support.map(ref)}};
 if(!conditionsOnly)validateSubmission(payload);return payload;
}
export function validateSubmission(p){
 const fail=()=>{throw Error('invalid-submission');};
 if(!keys(p,['version','engine','source','base','progress','products','options','plan'])||p.version!==1||p.engine!==ENGINE||!/^\w{40}$/.test(p.source))fail();
 if(!keys(p.base,['rooms'])||!keys(p.base.rooms,Object.keys(p.base.rooms??{}))||Object.keys(p.base.rooms).length>40)fail();
 for(const [k,r] of Object.entries(p.base.rooms))if(!id(k)||!keys(r,['type','level','ambience'])||!['MANUFACTURE','TRADING','POWER','CONTROL','HIRE','DORMITORY','TRAINING','MEETING','WORKSHOP','PRIVATE'].includes(r.type)||!integer(r.level,0,5)||(r.ambience!==undefined&&!integer(r.ambience,0,5000)))fail();
 if(!keys(p.progress,Object.keys(p.progress??{}))||!Object.keys(p.progress).length||Object.keys(p.progress).length>600)fail();
 for(const [k,s] of Object.entries(p.progress))if(!id(k)||!keys(s,['owned','elite','level'])||s.owned!==true||!integer(s.elite,0,2)||!integer(s.level,1,90))fail();
 if(!keys(p.products,Object.keys(p.products??{})))fail();
 for(const [k,v] of Object.entries(p.products))if(!p.base.rooms[k]||!['1','2','3','4','13','14'].includes(v))fail();
 const o=p.options;if(!keys(o,['teams','rotation','extraActions','priority','ambience','missingClues'])||![2,3].includes(o.teams)||!['first','all','12h','24h'].includes(o.rotation)||typeof o.extraActions!=='boolean'||!Array.isArray(o.priority)||o.priority.length!==3||new Set(o.priority).size!==3||o.priority.some(k=>!['F_GOLD','F_EXP','F_DIAMOND'].includes(k))||!keys(o.ambience,Object.keys(o.ambience??{})))fail();
 if(o.missingClues!==undefined&&(!Array.isArray(o.missingClues)||o.missingClues.length>7||new Set(o.missingClues).size!==o.missingClues.length||o.missingClues.some(n=>!integer(n,1,7))))fail();
 for(const [k,v] of Object.entries(o.ambience))if(!p.base.rooms[k]||!integer(v,0,5000))fail();
 const a=p.plan,refs=v=>Array.isArray(v)&&v.length<=600&&v.every(k=>id(k)&&Object.hasOwn(p.progress,k));
 if(!keys(a,['rooms','teams','residents','support'])||!Array.isArray(a.rooms)||a.rooms.length>30||new Set(a.rooms).size!==a.rooms.length||a.rooms.some(k=>!id(k)||!Object.hasOwn(p.base.rooms,k))||!Array.isArray(a.teams)||a.teams.length!==o.teams||a.teams.some(t=>!Array.isArray(t)||t.length!==a.rooms.length||t.some(r=>!refs(r)||r.length>5))||!refs(a.residents)||!refs(a.support))fail();
 return p;
}
export function decodePlan(model,p){
 const indices=new Map(model.pool.map(o=>[o.id,o.index])),rooms=model.rooms.filter(r=>r.type!=='DORMITORY'),ref=k=>{if(!indices.has(k))throw Error('missing-operator');return indices.get(k);};
 if(rooms.length!==p.rooms.length)throw Error('rooms-mismatch');
 return {rooms,teams:p.teams.map(t=>rooms.map(r=>{const i=p.rooms.indexOf(r.id);if(i<0)throw Error('rooms-mismatch');return t[i].map(ref);})),residents:p.residents.map(ref),support:p.support.map(ref)};
}
export function conditionKey(p){
 const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
 return JSON.stringify(stable({engine:p.engine,source:p.source,base:p.base,progress:p.progress,products:p.products,options:p.options}));
}
