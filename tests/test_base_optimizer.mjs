import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {prepareModel,evaluateSnapshot,simulatePlan,validatePlan,compareScores,optimizeBase,normalizeOptions} from '../assets/js/base-optimizer.mjs';
import {compileSkill,unlockSkills} from '../assets/js/base-skills.mjs';
import {normalizeBuilding,prepareBase,readBase} from '../assets/js/base-state.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../data/base-optimizer.json',import.meta.url)));
const progress=ids=>Object.fromEntries(ids.map(id=>[id,{owned:true,elite:2,level:90}]));
const allProgress=progress(Object.keys(data.characters));
function modelFixture({teams=2,rotation='12h',extraActions=false,dorm=true,ids=['char_502_nblade','char_503_rang','char_120_hibisc','char_501_durin']}={}){
 const base={rooms:{slot_25:{type:'MANUFACTURE',level:1},...(dorm?{slot_28:{type:'DORMITORY',level:5,ambience:5000}}:{})}};
 return prepareModel(data,base,progress(ids),{slot_25:'4'},{teams,rotation,extraActions});
}
function planFor(model,indices){return {rooms:model.rooms.filter(r=>r.type!=='DORMITORY'),teams:indices.map(i=>[[i]]),residents:[],support:[]};}
test('owned operators only; unlock gates include level and replace earlier skills',()=>{
 const buffs=Object.fromEntries(Object.values(data.buffs).map(b=>[b.id,compileSkill(b)]));
 const lancet=data.characters.char_285_medic2;
 assert.equal(unlockSkills(lancet,{elite:0,level:29},buffs).some(s=>s.room==='DORMITORY'),false);
 assert.equal(unlockSkills(lancet,{elite:0,level:30},buffs).some(s=>s.room==='DORMITORY'),true);
 const durin=unlockSkills(data.characters.char_501_durin,{elite:0,level:30},buffs);
 assert.equal(durin.length,1);assert.equal(durin[0].id,'dorm_rec_all&oneself[001]');
 const base={rooms:{slot_25:{type:'MANUFACTURE',level:1}}};
 const model=prepareModel(data,base,{char_501_durin:{owned:false,elite:2,level:90},char_502_nblade:{owned:true,elite:0,level:1}},{slot_25:'4'},{});
 assert.deepEqual(model.pool.map(o=>o.id),['char_502_nblade']);
});
test('ambience is preserved across account normalization and storage; missing remains unknown',()=>{
 const raw={roomSlots:{slot_28:{roomId:'DORMITORY',level:3,charInstIds:[]}},rooms:{DORMITORY:{slot_28:{comfort:2700}}}};
 const normalized=normalizeBuilding(raw),saved=prepareBase(normalized,'now');assert.equal(saved.rooms.slot_28.ambience,2700);assert.equal(readBase(saved).rooms.slot_28.ambience,2700);
 assert.throws(()=>prepareBase({...normalized,rooms:[{...normalized.rooms[0],ambience:3001}]},'now'),/인테리어/);
 delete raw.rooms.DORMITORY.slot_28.comfort;assert.equal(normalizeBuilding(raw).rooms[0].ambience,undefined);
});
test('missing recipe and ambience block calculation rather than assuming best values',()=>{
 const model=prepareModel(data,{rooms:{slot_25:{type:'MANUFACTURE',level:1},slot_28:{type:'DORMITORY',level:3}}},allProgress,{},{});
 assert.match(model.missing.join(' '),/생산 품목/);assert.match(model.missing.join(' '),/인테리어/);
});
test('2/3 shifts and strict priority normalization; no weighted tradeoff',()=>{
 assert.equal(normalizeOptions({teams:3}).teams,3);assert.equal(normalizeOptions({teams:7}).teams,2);
 assert.deepEqual(normalizeOptions({priority:['F_EXP','F_EXP']}).priority,['F_EXP','F_GOLD','F_DIAMOND']);
 assert.equal(compareScores([100,0,0],[99.999,100000,100000]),1);
});
test('one worker adds base 1% productivity; exhausted skill is disabled',()=>{
 const model=modelFixture(),room=model.rooms[0],op=model.pool.find(o=>o.name==='야토'),morale=Float64Array.from(model.pool,()=>24),worked=new Float64Array(model.pool.length);
 let s=evaluateSnapshot(model,[{room,ops:[op]}],morale,worked);assert.ok(Math.abs(s.factories[0].multiplier-1.16)<1e-8);
 morale[op.index]=0;s=evaluateSnapshot(model,[{room,ops:[op]}],morale,worked);assert.equal(s.factories[0].multiplier,1.01);
});
test('three workers reduce morale consumption before individual modifiers',()=>{
 const m=modelFixture(),room={...m.rooms[0],capacity:3,level:3};
 const s=evaluateSnapshot(m,[{room,ops:m.pool.slice(0,3)}],Float64Array.from(m.pool,()=>24),new Float64Array(m.pool.length));
 assert.ok(s.rates[0]>-1);
});
test('Vermeil capacity combination and automation replacement are nonlinear',()=>{
 const ids=Object.keys(data.characters);const base={rooms:{slot_25:{type:'MANUFACTURE',level:3},slot_26:{type:'POWER',level:3},slot_16:{type:'POWER',level:3},slot_7:{type:'POWER',level:3}}};
 const m=prepareModel(data,base,progress(ids),{slot_25:'4'},{}),find=name=>m.pool.find(o=>o.name===name),r=m.rooms[0],morale=Float64Array.from(m.pool,()=>24),worked=new Float64Array(m.pool.length);
 const verm=find('버메일'),cuora=find('쿠오라');const a=evaluateSnapshot(m,[{room:r,ops:[verm,cuora]}],morale,worked).factories[0];
 const solo=evaluateSnapshot(m,[{room:r,ops:[cuora]}],morale,worked).factories[0];assert.ok(a.multiplier>solo.multiplier+.15);
 const weedy=find('위디'),simple=find('사일런스 더 패러디그매틱');
 const automated=evaluateSnapshot(m,[{room:r,ops:[weedy,simple]}],morale,worked).factories[0];assert.ok(Math.abs(automated.multiplier-1.47)<1e-8);
});
test('R6 control team can be resident, but a draining fifth member cannot',()=>{
 const base={rooms:{slot_34:{type:'CONTROL',level:5}}};const m=prepareModel(data,base,allProgress,{},{});
 const rainbow=m.pool.filter(o=>['Ash','Blitz','Frost','Tachanka'].includes(o.name));assert.equal(rainbow.length,4);
 const control=m.rooms[0],morale=Float64Array.from(m.pool,()=>24),worked=new Float64Array(m.pool.length),s=evaluateSnapshot(m,[{room:control,ops:rainbow}],morale,worked);
 assert.ok(rainbow.every(o=>Math.abs(s.rates[o.index])<1e-8));
 const aak=m.pool.find(o=>o.name==='아'),withAak=evaluateSnapshot(m,[{room:control,ops:[...rainbow,aak]}],morale,worked);assert.ok(withAak.rates[aak.index]<0);
});
test('dorm level, ambience and strongest group recovery work at zero morale',()=>{
 const m=modelFixture(),dorm=m.rooms.find(r=>r.type==='DORMITORY'),durin=m.pool.find(o=>o.name==='두린'),target=m.pool.find(o=>o.name==='야토'),morale=new Float64Array(m.pool.length);
 const s=evaluateSnapshot(m,[{room:dorm,ops:[durin,target]}],morale,new Float64Array(m.pool.length));assert.equal(dorm.recovery,4);assert.ok(Math.abs(s.rates[target.index]-4.25)<1e-8);
});
test('Fiammetta has fixed recovery rather than ambience plus skill recovery',()=>{
 const m=modelFixture({ids:['char_300_phenxi','char_501_durin']}),room=m.rooms.find(r=>r.type==='DORMITORY');
 const s=evaluateSnapshot(m,[{room,ops:m.pool}],new Float64Array(m.pool.length),new Float64Array(m.pool.length));assert.equal(s.rates[0],2);
});
test('same worker cannot be duplicated across shifts or rooms',()=>{
 const m=modelFixture(),plan=planFor(m,[0,0]);assert.throws(()=>validatePlan(m,plan),/교대조 간 중복/);
 plan.residents=[0];assert.equal(validatePlan(m,plan),true);
 const sim=simulatePlan(m,plan);assert.equal(sim.valid,false);assert.match(sim.reason,/상주 조건/);
});
test('capacity stops production until shift collection; progress is retained',()=>{
 const m=modelFixture({ids:['char_503_rang','char_120_hibisc']}),p=planFor(m,[0,1]);
 const result=simulatePlan(m,p,{cycles:4,record:true});assert.equal(result.valid,true);assert.ok(result.stages.every(s=>Math.abs(s.hours-12)<1e-8));assert.ok(result.score[0]>.5&&result.score[0]<1);
 const first=modelFixture({rotation:'first',ids:['char_503_rang','char_120_hibisc']}),r=simulatePlan(first,planFor(first,[0,1]),{cycles:4,record:true});assert.equal(r.valid,true);assert.ok(r.stages.some(s=>s.blocked.length));assert.ok(r.score[0]<result.score[0]);
});
test('two and three shift schedules are sequential, rest has no simultaneous duplicate',()=>{
 for(const teams of [2,3]){const m=modelFixture({teams}),p=planFor(m,Array.from({length:teams},(_,i)=>i)),r=simulatePlan(m,p,{cycles:4,record:true});assert.equal(r.valid,true);
 for(const stage of r.stages){const indices=stage.rooms.flatMap(room=>room.operators);assert.equal(new Set(indices).size,indices.length);assert.ok(stage.rooms.filter(room=>room.type==='DORMITORY').every(room=>room.operators.length<=5));}
 assert.ok(r.stages.slice(-teams).every((s,i)=>s.team===i));}
});
test('first depletion refuses zero-hour reentry when recovery is insufficient',()=>{
 const m=modelFixture({rotation:'first',dorm:false,ids:['char_503_rang','char_120_hibisc']}),r=simulatePlan(m,planFor(m,[0,1]),{cycles:4});assert.equal(r.valid,false);assert.match(r.reason,/즉시 재교대/);
});
test('unsupported room effect is explicitly excluded and explained',()=>{
 const m=modelFixture({ids:['char_163_hpsts','char_502_nblade']});const unsupported=m.pool.find(o=>o.skills.some(s=>s.room==='MANUFACTURE'&&s.kind==='unsupported'));
 if(unsupported){assert.equal(m.canPlace(unsupported,m.rooms[0]),false);assert.ok(m.warnings.some(w=>w.operator===unsupported.name));}
 const fake={id:'new_unhandled[000]',name:'new',description:'unknown',room:'MANUFACTURE',base:0,targets:[]};assert.equal(compileSkill(fake).kind,'unsupported');
});
test('optimizer returns only physically valid assignments and can cancel',async()=>{
 const m=modelFixture();const r=await optimizeBase(m,{budgetMs:80});assert.equal(r.status,'recommended');assert.equal(r.optimal,false);assert.equal(validatePlan(m,r.plan),true);assert.ok(r.stages.length);assert.ok(r.score.every(Number.isFinite));
 await assert.rejects(()=>optimizeBase(m,{isCancelled:()=>true}),/취소/);
});
test('UI is below scroll viewport and offers persistent settings and cancellation',()=>{
 const html=fs.readFileSync(new URL('../base.html',import.meta.url),'utf8');assert.ok(html.indexOf('id="baseOptimizer"')>html.indexOf('id="baseStatus"'));
 for(const id of ['optimizerTeams','optimizerRotation','optimizerExtra','optimizerPriority1','optimizerDorms','optimizerRun','optimizerCancel'])assert.ok(html.includes(`id="${id}"`));
 assert.ok(html.includes('base-optimizer-ui.mjs'));
});
