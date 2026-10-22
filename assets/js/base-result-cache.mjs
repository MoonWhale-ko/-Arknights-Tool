const KEY='arknightsBaseLayoutV1:optimizer-results-v1';
function readCache(storage){try{const cache=JSON.parse(storage.getItem(KEY)||'null');return cache?.version===1?cache:{version:1};}catch{return {version:1};}}
const sort=v=>Array.isArray(v)?v.map(sort):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sort(v[k])])):v;
export function resultSignature(base,progress,products,trading,options){
 const owned=Object.fromEntries(Object.entries(progress??{}).filter(([,s])=>s?.owned===true).map(([id,s])=>[id,{elite:s.elite??0,level:s.level??1}]));
 return JSON.stringify(sort({revision:1,base,owned,products,trading,options}));
}
export function saveResult(storage,mode,signature,report){
 try{const cache=readCache(storage);cache[mode]={signature,savedAt:new Date().toISOString(),report};storage.setItem(KEY,JSON.stringify(cache));return true;}catch{return false;}
}
export function loadResult(storage,mode,signature){
 try{const cache=JSON.parse(storage.getItem(KEY)||'null'),entry=cache?.version===1?cache[mode]:null;return entry?.signature===signature&&entry.report?.best&&Array.isArray(entry.report.rooms)&&Array.isArray(entry.report.best.plan?.groups)?entry:null;}catch{return null;}
}
export function forgetResult(storage,mode){try{const cache=readCache(storage);if(cache.version===1){delete cache[mode];storage.setItem(KEY,JSON.stringify(cache));}return true;}catch{return false;}}
