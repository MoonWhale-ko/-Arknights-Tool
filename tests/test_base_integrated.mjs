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
 const prepared=prepareIntegratedInput(catalog,base,example.progress,{},options);
 const url=new URL('../assets/js/base-integrated-worker.mjs',import.meta.url).href,source=`import {parentPort} from 'node:worker_threads';globalThis.self={postMessage:v=>parentPort.postMessage(v)};await import(${JSON.stringify(url)});parentPort.on('message',data=>self.onmessage({data}));parentPort.postMessage({type:'ready'});`;
 const w=new Worker(new URL('data:text/javascript,'+encodeURIComponent(source)),{type:'module'});
 try{const report=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('worker timeout')),10000);w.on('error',reject);w.on('message',d=>{if(d.type==='ready')w.postMessage({catalog,...prepared,seconds:1});if(d.type==='error'){clearTimeout(timer);reject(Error(d.message));}if(d.type==='result'){clearTimeout(timer);resolve(d.result);}});});assert.equal(report.modelVersion,'terra27-time-simulator-3');assert.ok(report.best.at24);assert.ok(report.best.cycle);assert.equal(report.stats.evaluationErrors,0);assert.ok(report.rooms.some(r=>r.type==='TRAINING'));assert.ok(report.best.plan.groups.every(g=>g.room!=='training'||g.operators.length===0));assert.ok(report.best.events.every(e=>(e.rooms??[]).every(r=>r.id!=='training'||r.operators.length===0)));assert.equal(report.operators.char_486_takila.name,'테킬라');assert.equal(report.input.options.teams,2);assert.doesNotThrow(()=>JSON.parse(JSON.stringify(report)));}finally{await w.terminate();}
});

test('meeting compares passive-only operators against skill holders in the actual rotation search',async()=>{
 const {createTerraModel,terra}=await import('../assets/js/infra-v2-terra-model.mjs?v=3');
 const {solveHeuristic}=await import('../assets/js/infra-v2-heuristic.mjs?v=2');
 const {simulate}=await import('../assets/js/infra-v2-core.mjs?v=2');
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
 const {createTerraModel,terra}=await import('../assets/js/infra-v2-terra-model.mjs?v=3');
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

test('passive meeting candidates preserve the one missing-clue specialist limit',async()=>{
 const {meetingTeamAllowed}=await import('../assets/js/infra-v2-core.mjs?v=2');
 const passive={skills:[]},missing={skills:[{room:'MEETING',kind:'missing'}]};
 assert.ok(meetingTeamAllowed([passive,missing],{},true));assert.ok(meetingTeamAllowed([passive,passive],{},true));assert.equal(meetingTeamAllowed([missing,missing],{},true),false);
});
