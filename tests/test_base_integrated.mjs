import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {Worker} from 'node:worker_threads';
import {prepareIntegratedInput} from '../assets/js/base-integrated-adapter.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../data/base-optimizer.json',import.meta.url))),example={"base":{"rooms":{"trading":{"type":"TRADING","level":3},"meeting":{"type":"MEETING","level":3},"office":{"type":"HIRE","level":3},"dorm":{"type":"DORMITORY","level":5,"ambience":5000},"control":{"type":"CONTROL","level":5},"power":{"type":"POWER","level":3},"workshop":{"type":"WORKSHOP","level":1}}},"progress":{"char_254_vodfox":{"owned":true,"elite":2,"level":1},"char_486_takila":{"owned":true,"elite":2,"level":1},"char_252_bibeak":{"owned":true,"elite":2,"level":1},"char_497_ctable":{"owned":true,"elite":2,"level":1},"char_4017_puzzle":{"owned":true,"elite":2,"level":1},"char_503_rang":{"owned":true,"elite":0,"level":30},"char_283_midn":{"owned":true,"elite":0,"level":30}},"options":{"teams":2,"rotation":"12h","maxHours":24,"missingClues":[1,3],"optimizeDormSupport":false},"candidates":{"trading":["char_254_vodfox","char_486_takila","char_252_bibeak","char_283_midn"],"meeting":["char_497_ctable","char_4017_puzzle"]}};
const options={...example.options,ambience:{dorm:5000},priority:['F_GOLD','F_EXP','F_DIAMOND'],rankingWindow:'24h'};
test('integration takes owned current development, recipes and built rooms without account credentials or future plans',()=>{
 const progress={...example.progress,char_500_noirc:{owned:false,elite:0,level:30}},base={...example.base,email:'private@example.com',uid:'do-not-copy',rooms:{...example.base.rooms,empty:{type:'MANUFACTURE',level:0}}};
 const r=prepareIntegratedInput(catalog,base,progress,{},options);assert.ok(!r.input.progress.char_500_noirc);assert.equal(r.input.progress.char_486_takila.elite,2);assert.ok(!r.input.base.rooms.empty);assert.equal(r.input.base.rooms.dorm.ambience,5000);assert.ok(!JSON.stringify(r).includes('private@example.com'));assert.ok(!JSON.stringify(r).includes('do-not-copy'));
});
test('unknown owned operators are reported, while no owned roster and missing ambience are actionable errors',()=>{
 const r=prepareIntegratedInput(catalog,example.base,{...example.progress,char_unknown:{owned:true,elite:0,level:1}},{},options);assert.ok(r.warnings.some(w=>w.includes('char_unknown')));
 assert.throws(()=>prepareIntegratedInput(catalog,example.base,{}, {},options),/보유 오퍼레이터/);
 const base=structuredClone(example.base);delete base.rooms.dorm.ambience;assert.throws(()=>prepareIntegratedInput(catalog,base,example.progress,{}, {...options,ambience:{}}),/인테리어/);
});
test('manufacturing selection is required and unsupported trade type never silently becomes gold',()=>{
 const base=structuredClone(example.base);base.rooms.factory={type:'MANUFACTURE',level:1};assert.throws(()=>prepareIntegratedInput(catalog,base,example.progress,{},options),/생산 품목/);
 const r=prepareIntegratedInput(catalog,base,example.progress,{factory:'4'},options);assert.equal(r.input.products.factory,'4');assert.throws(()=>prepareIntegratedInput(catalog,base,example.progress,{factory:'4'},options,{trading:'originium'}),/오리지늄/);
});
test('the same-origin production worker returns the integrated roster and 24h/cycle results',async()=>{
 const base=structuredClone(example.base);base.rooms.training={type:'TRAINING',level:3};
 const progress={...example.progress,char_4014_lunacu:{owned:true,elite:0,level:1},char_193_frostl:{owned:true,elite:0,level:1}};
 const prepared=prepareIntegratedInput(catalog,base,progress,{},options);
 const url=new URL('../assets/js/base-integrated-worker.mjs',import.meta.url).href,source=`import {parentPort} from 'node:worker_threads';globalThis.self={postMessage:v=>parentPort.postMessage(v)};await import(${JSON.stringify(url)});parentPort.on('message',data=>self.onmessage({data}));parentPort.postMessage({type:'ready'});`;
 const w=new Worker(new URL('data:text/javascript,'+encodeURIComponent(source)),{type:'module'});
 try{const report=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('worker timeout')),10000);w.on('error',reject);w.on('message',d=>{if(d.type==='ready')w.postMessage({catalog,...prepared,seconds:1});if(d.type==='error'){clearTimeout(timer);reject(Error(d.message));}if(d.type==='result'){clearTimeout(timer);resolve(d.result);}});});assert.equal(report.modelVersion,'terra27-time-simulator-5');assert.ok(report.best.at24);assert.ok(report.best.cycle);assert.equal(report.stats.evaluationErrors,0);assert.ok(report.rooms.some(r=>r.type==='TRAINING'));assert.ok(report.best.plan.groups.every(g=>g.room!=='training'||g.operators.length===0));assert.ok(report.best.events.every(e=>(e.rooms??[]).every(r=>r.id!=='training'||r.operators.length===0)));assert.equal(report.operators.char_486_takila.name,'테킬라');assert.equal(report.input.options.teams,2);assert.ok(!report.input.progress.char_455_nothin&&!report.input.progress.char_391_rosmon);for(const ids of Object.values(report.best.plan.dormSupport??{}))assert.ok(!ids.includes('char_4014_lunacu')&&!ids.includes('char_193_frostl'));assert.doesNotThrow(()=>JSON.parse(JSON.stringify(report)));}finally{await w.terminate();}
});

test('meeting compares passive-only operators against skill holders in the actual rotation search',async()=>{
 const {createTerraModel,terra}=await import('../assets/js/infra-v2-terra-model.mjs?v=6');
 const {solveHeuristic}=await import('../assets/js/infra-v2-heuristic.mjs?v=4');
 const {simulate}=await import('../assets/js/infra-v2-core.mjs?v=4');
 const high=terra.J.filter(o=>o.rarity===6&&!o.skills.some(s=>s.room==='MEETING')).slice(0,4).map(o=>o.id);
 const raw={base:{rooms:{meeting:{type:'MEETING',level:3},training:{type:'TRAINING',level:3}}},progress:Object.fromEntries([...high.map(id=>[id,{owned:true,elite:2,level:1}]),['char_009_12fce',{owned:true,elite:0,level:30}]]),options:{teams:2,rotation:'12h',maxHours:24,missingClues:[],optimizeDormSupport:false,priority:options.priority}};
 const model=createTerraModel(catalog,raw),task=model.tasks.find(t=>t.type==='MEETING');
 for(const id of high){assert.equal(model.byId[id].skills.some(s=>s.room==='MEETING'),false);assert.ok(task.candidates.includes(id));assert.ok(task.accept([id]));}
 assert.equal(model.tasks.some(t=>t.type==='TRAINING'),false);
 const result=solveHeuristic(model,{maxMilliseconds:2000,exactThreshold:10000,starts:2});
 assert.ok(result.best);const selected=result.best.plan.groups.flatMap(g=>g.operators);
 assert.equal(selected.length,4);assert.equal(new Set(selected).size,4);assert.ok(selected.every(id=>high.includes(id)));
 assert.ok(Math.abs(result.best.at24.meetingEquivalentHours/24-1.63)<1e-8);
 const mixed=structuredClone(result.best.plan);mixed.groups[0].operators[0]='char_009_12fce';
 assert.ok(simulate(model,mixed).at24.meetingEquivalentHours<result.best.at24.meetingEquivalentHours);
 const duplicate=structuredClone(result.best.plan);duplicate.groups[1].operators[0]=duplicate.groups[0].operators[0];assert.throws(()=>simulate(model,duplicate),/중복/);
});

test('meeting adds facility, total dorm ambience, rarity and elite bonuses; exhausted passive bonus stops',async()=>{
 const {createTerraModel,terra}=await import('../assets/js/infra-v2-terra-model.mjs?v=6');
 const four=terra.J.find(o=>o.rarity===4&&!o.skills.some(s=>s.room==='MEETING')).id;
 const five=terra.J.find(o=>o.rarity===5&&!o.skills.some(s=>s.room==='MEETING')).id;
 const rate=(id,elite,level,ambience,morale=24)=>{
  const model=createTerraModel(catalog,{base:{rooms:{meeting:{type:'MEETING',level},dorm:{type:'DORMITORY',level:5,ambience}}},progress:{[id]:{owned:true,elite,level:1}},options:{...options,ambience:{dorm:ambience},optimizeDormSupport:false}});
  const op=model.byId[id],room=model.rooms.find(r=>r.type==='MEETING');
  return model.snapshotEvaluator(model,[{room,ops:[op]}],{[id]:morale},{[id]:0}).meetings[0].multiplier;
 };
 assert.ok(rate(four,1,3,0)>rate(five,0,3,0));
 for(const [level,base] of [[1,1.07],[2,1.09],[3,1.11]])for(const [ambience,bonus] of [[0,0],[1999,0],[2000,.05],[2999,.05],[3000,.1],[3999,.1],[4000,.15],[5000,.15]]){
  assert.ok(Math.abs(rate(four,1,level,ambience)-(base+bonus+.07+.08))<1e-8);
 }
 assert.ok(Math.abs(rate(four,1,3,4000,0)-1.26)<1e-8);
});

test('meeting has no missing-clue specialist limit when ownership preference is disabled',async()=>{
 const {meetingTeamAllowed}=await import('../assets/js/infra-v2-core.mjs?v=4');
 const passive={skills:[]},missing={skills:[{room:'MEETING',kind:'missing'}]};
 assert.ok(meetingTeamAllowed([passive,missing],{},true));assert.ok(meetingTeamAllowed([passive,passive],{},true));assert.ok(meetingTeamAllowed([missing,missing],{missingClues:[]},true));assert.equal(meetingTeamAllowed([missing,missing],{missingClues:[1]},true),false);
});


test('site ignores previous clue ownership settings in every calculation',()=>{
 const old=prepareIntegratedInput(catalog,example.base,example.progress,{},options);
 const cleared=prepareIntegratedInput(catalog,example.base,example.progress,{}, {...options,missingClues:[]});
 assert.deepEqual(old.input.options.missingClues,[]);assert.deepEqual(old,cleared);
 const html=fs.readFileSync(new URL('../base.html',import.meta.url),'utf8');assert.ok(!html.includes('optimizerClueSettings'));assert.ok(!html.includes('미보유 단서'));
});

test('production and trade income outrank reception efficiency in both comparison windows',async()=>{
 const {score,compare}=await import('../assets/js/infra-v2-core.mjs?v=4');
 const point=(office,exp,lmd,meeting)=>({hour:24,missingSkillPolicyHours:0,hourly:{office,meeting,products:{F_EXP:exp,F_GOLD:2,F_DIAMOND:1}},trade:{hourlyLmd:lmd}});
 const model={meetingLast:true,input:{options:{priority:['F_EXP','F_GOLD','F_DIAMOND'],rankingWindow:'24h'}},work:[{type:'TRADING'}]};
 for(const window of ['24h','cycle']){
  model.input.options.rankingWindow=window;
  const value=p=>score(model,{status:'ok',at24:p,cycle:p});
  assert.deepEqual(value(point(1,3,100,9)),[1,3,2,1,100,9]);
  assert.ok(compare(value(point(1,4,0,1)),value(point(1,3,1000,100)))>0);
  assert.ok(compare(value(point(1,3,101,1)),value(point(1,3,100,100)))>0);
  assert.ok(compare(value(point(1,3,100,2)),value(point(1,3,100,1)))>0);
  assert.ok(compare(value(point(2,0,0,0)),value(point(1,1000,1000,1000)))>0);
 }
});

test('Tragodia stays in EXP manufacturing before reception in exact and heuristic searches',async()=>{
 const {createTerraModel}=await import('../assets/js/infra-v2-terra-model.mjs?v=6');
 const {solveHeuristic}=await import('../assets/js/infra-v2-heuristic.mjs?v=4');
 const {simulate,score,compare}=await import('../assets/js/infra-v2-core.mjs?v=4');
 const raw={base:{rooms:{meeting:{type:'MEETING',level:3},factory:{type:'MANUFACTURE',level:1}}},progress:{char_1042_phatm2:{owned:true,elite:2,level:1},char_009_12fce:{owned:true,elite:0,level:30},char_500_noirc:{owned:true,elite:0,level:30}},products:{factory:'1'},options:{teams:2,rotation:'12h',maxHours:24,priority:['F_EXP','F_GOLD','F_DIAMOND'],optimizeDormSupport:false}};
 for(const exactThreshold of [10000,0]){
  const model=createTerraModel(catalog,raw),result=solveHeuristic(model,{maxMilliseconds:3000,exactThreshold,starts:2});
  assert.ok(result.best);assert.equal(result.stats.evaluationErrors,0);
  const factory=result.best.plan.groups.find(g=>g.room==='factory'&&g.operators.includes('char_1042_phatm2'));
  assert.ok(factory,'Tragodia must be assigned to EXP manufacturing');
  const alternate=structuredClone(result.best.plan),room=alternate.groups.find(g=>g.room==='meeting'&&g.team===factory.team);
  alternate.groups.find(g=>g.room==='factory'&&g.team===factory.team).operators=[];room.operators=['char_1042_phatm2'];
  const moved=simulate(model,alternate);assert.ok(result.best.at24.produced.F_EXP>moved.at24.produced.F_EXP);
  assert.ok(compare(result.best.score,score(model,moved))>0);
 }
});


test('fresh account dorm scores replace stale manual values, while same-import edits persist',async()=>{
 const {dormAmbienceSource,resolveDormAmbience}=await import('../assets/js/base-optimizer-settings.mjs');
 const {normalizeBuilding,prepareBase}=await import('../assets/js/base-state.mjs');
 const building={roomSlots:{slot_28:{roomId:'DORMITORY',level:5,charInstIds:[]},slot_20:{roomId:'DORMITORY',level:3,charInstIds:[]}},rooms:{DORMITORY:{slot_28:{comfort:4800},slot_20:{comfort:2700}}}};
 const base=prepareBase(normalizeBuilding(building),'import-1'),stale={slot_28:1000,slot_20:0};
 assert.deepEqual(resolveDormAmbience(base,stale),{slot_28:4800,slot_20:2700});
 const source=dormAmbienceSource(base);
 assert.deepEqual(resolveDormAmbience(base,stale,source),stale);
 const next=prepareBase(normalizeBuilding(building),'import-2');
 assert.deepEqual(resolveDormAmbience(next,stale,source),{slot_28:4800,slot_20:2700});
 delete building.rooms.DORMITORY.slot_20.comfort;
 const missing=prepareBase(normalizeBuilding(building),'import-3');
 assert.equal(resolveDormAmbience(missing,stale,source).slot_20,undefined);
 assert.equal(resolveDormAmbience(missing,{slot_20:0},dormAmbienceSource(missing)).slot_20,0);
 assert.equal(resolveDormAmbience(base,{slot_28:null},source).slot_28,null);
 assert.deepEqual(resolveDormAmbience({...base,source:'manual'},stale),stale);
 assert.notEqual(dormAmbienceSource({...base,rooms:{...base.rooms,slot_20:{...base.rooms.slot_20,level:2}}}),source);
});


test('self-only dorm occupants never reserve support beds, even with occupancy links',async()=>{
 const {createTerraModel}=await import('../assets/js/infra-v2-terra-model.mjs?v=6');
 const {simulate,score,compare}=await import('../assets/js/infra-v2-core.mjs?v=4');
 const {trimDormSupport}=await import('../assets/js/base-dorm-support.mjs?v=2');
 const raw={base:{rooms:{factory:{type:'MANUFACTURE',level:1},dorm:{type:'DORMITORY',level:5,ambience:5000}}},products:{factory:'4'},progress:{char_4014_lunacu:{owned:true,elite:0,level:1},char_193_frostl:{owned:true,elite:0,level:1},char_501_durin:{owned:true,elite:0,level:30},char_502_nblade:{owned:true,elite:0,level:30},char_500_noirc:{owned:true,elite:0,level:30},char_391_rosmon:{owned:true,elite:2,level:1}},options:{teams:2,rotation:'12h',maxHours:24,optimizeDormSupport:false,priority:['F_GOLD','F_EXP','F_DIAMOND']}};
 const plan={groups:[{team:0,room:'factory',operators:['char_502_nblade']},{team:1,room:'factory',operators:['char_500_noirc']}],dormSupport:{dorm:['char_4014_lunacu','char_193_frostl','char_501_durin']}};
 const model=createTerraModel(catalog,raw),before=simulate(model,plan),cleaned=trimDormSupport(model,plan);
 assert.deepEqual(cleaned.plan.dormSupport.dorm,['char_501_durin']);assert.ok(compare(score(model,cleaned.result),score(model,before))>=0);
 assert.ok(model.canPlace(model.byId.char_193_frostl,model.rooms.find(r=>r.type==='DORMITORY')),'self recovery must remain available during normal rest');
 // Occupancy links must not reintroduce pure self-recovery operators as fixed supporters.
 const linkedRaw=structuredClone(raw);linkedRaw.base.rooms={trading:{type:'TRADING',level:3},dorm:raw.base.rooms.dorm};linkedRaw.products={};linkedRaw.progress.char_455_nothin={owned:true,elite:2,level:1};
 const linkedModel=createTerraModel(catalog,linkedRaw),linked={groups:[{team:0,room:'trading',operators:['char_455_nothin']},{team:1,room:'trading',operators:['char_500_noirc']}],dormSupport:plan.dormSupport};
 const linkedAfter=trimDormSupport(linkedModel,linked);
 assert.deepEqual(linkedAfter.plan.dormSupport.dorm,['char_501_durin']);
 assert.deepEqual(plan.dormSupport.dorm,['char_4014_lunacu','char_193_frostl','char_501_durin']);
});


test('automatic support candidates exclude current self-only skills without losing ordinary rest',async()=>{
 const {createTerraModel}=await import('../assets/js/infra-v2-terra-model.mjs?v=6');
 const {solveHeuristic}=await import('../assets/js/infra-v2-heuristic.mjs?v=4');
 const {isSelfOnlyDormSupport}=await import('../assets/js/base-dorm-support.mjs?v=2');
 const progress={char_4014_lunacu:{owned:true,elite:0,level:1},char_193_frostl:{owned:true,elite:0,level:1},char_501_durin:{owned:true,elite:0,level:30},char_120_hibisc:{owned:true,elite:0,level:1},char_300_phenxi:{owned:true,elite:0,level:1},char_502_nblade:{owned:true,elite:0,level:30},char_500_noirc:{owned:true,elite:0,level:30}};
 const raw={base:{rooms:{factory:{type:'MANUFACTURE',level:1},dorm:{type:'DORMITORY',level:5,ambience:5000}}},products:{factory:'4'},progress,options:{teams:2,rotation:'12h',maxHours:48,optimizeDormSupport:true}};
 for(const exactThreshold of [100000,0]){
  const model=createTerraModel(catalog,raw),support=model.tasks.find(t=>t.type==='DORMITORY'),dorm=model.rooms.find(r=>r.type==='DORMITORY');
  for(const id of ['char_4014_lunacu','char_193_frostl']){assert.ok(isSelfOnlyDormSupport(model.byId[id]));assert.ok(!support.candidates.includes(id));assert.ok(model.canPlace(model.byId[id],dorm));}
  for(const id of ['char_501_durin','char_120_hibisc','char_300_phenxi'])assert.ok(support.candidates.includes(id));
  const result=solveHeuristic(model,{maxMilliseconds:3000,exactThreshold,starts:2});assert.ok(result.best);assert.equal(result.stats.evaluationErrors,0);
  for(const ids of Object.values(result.best.plan.dormSupport))for(const id of ids)assert.equal(isSelfOnlyDormSupport(model.byId[id]),false);
 }
});
