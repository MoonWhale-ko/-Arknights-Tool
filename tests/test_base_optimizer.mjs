import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {prepareModel,evaluateSnapshot,simulatePlan,validatePlan,compareScores,optimizeBase,normalizeOptions} from '../assets/js/base-optimizer.mjs';
import {compileSkill,unlockSkills} from '../assets/js/base-skills.mjs';
import {normalizeBuilding,prepareBase,readBase} from '../assets/js/base-state.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../data/base-optimizer.json',import.meta.url)));
const progress=ids=>Object.fromEntries(ids.map(id=>[id,{owned:true,elite:2,level:90}]));
const allProgress=progress(Object.keys(data.characters));
function modelFixture({teams=2,rotation='12h',extraActions=false,dorm=true,ids=['char_502_nblade','char_500_noirc','char_122_beagle','char_501_durin']}={}){
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
 const m=modelFixture({ids:['char_500_noirc','char_122_beagle']}),p=planFor(m,[0,1]);
 const result=simulatePlan(m,p,{cycles:4,record:true});assert.equal(result.valid,true);assert.ok(result.stages.every(s=>Math.abs(s.hours-12)<1e-8));assert.ok(result.score[3]>.5&&result.score[3]<1.3);
 const first=modelFixture({rotation:'first',ids:['char_500_noirc','char_122_beagle']}),r=simulatePlan(first,planFor(first,[0,1]),{cycles:4,record:true});assert.equal(r.valid,true);assert.ok(r.stages.some(s=>s.blocked.length));assert.ok(r.score[3]<result.score[3]);
});
test('two and three shift schedules are sequential, rest has no simultaneous duplicate',()=>{
 for(const teams of [2,3]){const m=modelFixture({teams}),p=planFor(m,Array.from({length:teams},(_,i)=>i)),r=simulatePlan(m,p,{cycles:4,record:true});assert.equal(r.valid,true);
 for(const stage of r.stages){const indices=stage.rooms.flatMap(room=>room.operators);assert.equal(new Set(indices).size,indices.length);assert.ok(stage.rooms.filter(room=>room.type==='DORMITORY').every(room=>room.operators.length<=5));}
 assert.ok(r.stages.slice(-teams).every((s,i)=>s.team===i));}
});
test('first depletion refuses zero-hour reentry when recovery is insufficient',()=>{
 const m=modelFixture({rotation:'first',dorm:false,ids:['char_500_noirc','char_122_beagle']}),r=simulatePlan(m,planFor(m,[0,1]),{cycles:4});assert.equal(r.valid,false);assert.match(r.reason,/즉시 재교대/);
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
function officeModel(){
 return prepareModel(data,{rooms:{office:{type:'HIRE',level:1},factory:{type:'MANUFACTURE',level:1},dorm:{type:'DORMITORY',level:5,ambience:5000},control:{type:'CONTROL',level:5}}},allProgress,{factory:'4'},{rotation:'12h'});
}
function officeSnapshot(m,skills,{morale=24,controlSkills=[],extra=[]}={}){
 const op={...m.pool[0],skills:skills.map(id=>compileSkill(data.buffs[id]))},cc={...m.pool[1],skills:controlSkills.map(id=>compileSkill(data.buffs[id]))};
 const values=Float64Array.from(m.pool,()=>24);values[op.index]=morale;
 const placements=[{room:m.rooms[0],ops:[op]},{room:m.rooms[2],ops:[]},...extra];
 if(controlSkills.length)placements.push({room:m.rooms[3],ops:[cc]});
 return evaluateSnapshot(m,placements,values,new Float64Array(m.pool.length));
}
test('office speed includes staffing bonus, dorm level and active skills only',()=>{
 const m=officeModel();
 assert.ok(Math.abs(officeSnapshot(m,['hire_spd[011]']).offices[0].multiplier-1.5)<1e-8);
 assert.ok(Math.abs(officeSnapshot(m,['hire_spd_dorm&lv[010]']).offices[0].multiplier-1.2)<1e-8);
 assert.ok(Math.abs(officeSnapshot(m,['hire_spd[011]'],{morale:0}).offices[0].multiplier-1.05)<1e-8);
});
test('office control threshold is strict and control buffs stack by maximum',()=>{
 const m=officeModel();
 let s=officeSnapshot(m,['hire_spd[000]'],{controlSkills:['control_hire_spd[000]','control_hire_spd&bd[000]']});
 assert.ok(Math.abs(s.offices[0].multiplier-1.55)<1e-8);
 s=officeSnapshot(m,['hire_spd[010]'],{controlSkills:['control_hire_spd[000]']});assert.ok(Math.abs(s.offices[0].multiplier-1.35)<1e-8);
 const fake={...m.pool[2],skills:[],groups:[]};
 const cc={...m.pool[3],skills:[compileSkill(data.buffs['control_hire_spd&bd[000]'])]};
 s=officeSnapshot(m,['hire_spd[000]'],{controlSkills:['control_hire_spd&bd[000]'],extra:[{room:{id:'cc2',type:'CONTROL'},ops:[cc,fake]}]});
 assert.ok(Math.abs(s.offices[0].multiplier-1.35)<1e-8);
});
test('office Blitz uses control-provided resources; conditional unsupported skills are excluded',()=>{
 const m=officeModel();
 const cc={...m.pool[1],groups:['rainbow'],skills:[compileSkill(data.buffs['control_mp_bd[000]'])]};
 const s=officeSnapshot(m,['hire_spd_blitz[000]'],{extra:[{room:m.rooms[3],ops:[cc]}]});
 assert.ok(Math.abs(s.offices[0].multiplier-1.3)<1e-8);
 assert.equal(compileSkill(data.buffs['hire_spd_cost&clue[000]']).kind,'unsupported');
});
test('office contact work integrates exhaustion over repeated 2/3 shifts and is always first',()=>{
 for(const teams of [2,3]){
  const m=modelFixture({teams,ids:['char_502_nblade','char_500_noirc','char_122_beagle','char_501_durin']});
  m.rooms.unshift({id:'office',type:'HIRE',level:1,capacity:1});
  for(const op of m.pool){op.skills=[{room:'HIRE',kind:'simple',prod:.45,drain:2,capacity:0,targets:[]}];}
  const p={rooms:m.rooms.filter(r=>r.type!=='DORMITORY'),teams:Array.from({length:teams},(_,i)=>[[i],[null]]),residents:[],support:[]};
  const r=simulatePlan(m,p,{cycles:5,record:true});assert.equal(r.valid,true);
  // Eight hours at 150%, then four hours at 105%; dorm fully restores the next shift.
  assert.ok(Math.abs(r.score[0]-1.35)<1e-8);assert.equal(r.score.length,6);
  assert.ok(r.stages.every(s=>Math.abs(s.products.HIRE-16.2)<1e-8));
  assert.equal(compareScores(r.score,[1.349,1e9,1e9,1e9,1e9,1e9]),1);
 }
});
test('without an office the leading objective is zero and manufacturing order is preserved',()=>{
 const m=modelFixture(),r=simulatePlan(m,planFor(m,[0,1]),{cycles:4});
 assert.equal(r.score[0],0);assert.ok(r.score[3]>0);
});
test('work requires an unlocked skill for that facility; ordinary dorm rest is allowed',async()=>{
 const m=prepareModel(data,{rooms:{factory:{type:'MANUFACTURE',level:1},office:{type:'HIRE',level:1},dorm:{type:'DORMITORY',level:5,ambience:5000}}},progress(['char_502_nblade','char_500_noirc','char_503_rang','char_120_hibisc']),{factory:'4'},{rotation:'12h'});
 const ranger=m.pool[2],hibiscus=m.pool[3];
 assert.equal(m.canPlace(ranger,m.rooms[0]),false);assert.equal(m.canPlace(ranger,m.rooms[1]),true);
 assert.equal(m.canPlace(hibiscus,m.rooms[0]),false);assert.equal(m.canPlace(ranger,m.rooms[2]),true);
 const bad={rooms:[m.rooms[0]],teams:[[[2]],[[1]]],residents:[],support:[]};assert.throws(()=>validatePlan(m,bad),/해당 시설 스킬/);
 const r=await optimizeBase(m,{budgetMs:60});assert.equal(r.status,'recommended');
 for(const team of r.plan.teams)for(const [j,indices] of team.entries())for(const i of indices)if(i!==null)assert.ok(m.pool[i].skills.some(s=>s.room===r.plan.rooms[j].type));
 const locked=prepareModel(data,{rooms:{factory:{type:'MANUFACTURE',level:1}}},{char_502_nblade:{owned:true,elite:0,level:1}},{factory:'4'},{});assert.equal(locked.canPlace(locked.pool[0],locked.rooms[0]),false);
});
function meetingModel({missingClues=[1],teams=2}={}){
 return prepareModel(data,{rooms:{meeting:{type:'MEETING',level:3},factory:{type:'MANUFACTURE',level:1},dorm:{type:'DORMITORY',level:5,ambience:5000}}},allProgress,{factory:'4'},{rotation:'12h',teams,missingClues});
}
function meetingSnapshot(m,skillIds,{elite=2,rarity=6,morale=24,level=3,worked=0,partner}={}){
 const op={...m.pool[0],elite,rarity,skills:skillIds.map(id=>compileSkill(data.buffs[id]))},values=Float64Array.from(m.pool,()=>24),hours=new Float64Array(m.pool.length);values[op.index]=morale;hours[op.index]=worked;
 const room={...m.rooms[0],level};return evaluateSnapshot(m,[{room,ops:partner?[op,partner]:[op]}],values,hours);
}
test('meeting facility capacity is always two and passive speed uses room level, rarity and elite',()=>{
 const m=meetingModel();assert.equal(m.rooms[0].capacity,2);
 for(const [level,bonus] of [[1,.07],[2,.14],[3,.25]]){
  const s=meetingSnapshot(m,['meet_spd[000]'],{level});assert.ok(Math.abs(s.meetings[0].multiplier-(1+bonus+.26+.1))<1e-8);
 }
 assert.ok(Math.abs(meetingSnapshot(m,['meet_spd[000]'],{morale:0}).meetings[0].multiplier-1.51)<1e-8);
 assert.ok(Math.abs(meetingSnapshot(m,['meet_spd[000]'],{elite:1,rarity:4}).meetings[0].multiplier-1.5)<1e-8);
 assert.equal(evaluateSnapshot(m,[{room:m.rooms[0],ops:[]}],new Float64Array(m.pool.length),new Float64Array(m.pool.length)).meetings[0].multiplier,0);
});
test('clue numbers are mapped by faction, not internal buff ID',()=>{
 for(const [id,clue] of [['meet_spd&team[010]',1],['meet_spd&team[020]',2],['meet_spd&team[030]',3],['meet_spd&team[050]',4],['meet_spd&team[070]',5],['meet_spd&team[040]',6],['meet_spd&team[060]',7]])assert.equal(compileSkill(data.buffs[id]).clue,clue);
});
test('missing clue policy favors matching or broad effects, disables exhausted effects and avoids owned bias',()=>{
 const m=meetingModel({missingClues:[4]});
 assert.equal(meetingSnapshot(m,['meet_spd&team[050]']).meetings[0].preference,1);
 assert.equal(meetingSnapshot(m,['meet_spd&team[040]']).meetings[0].preference,0);
 assert.equal(meetingSnapshot(m,['meet_spd_notOwned[010]']).meetings[0].preference,1);
 assert.equal(meetingSnapshot(m,['meet_spd_notOwned[010]'],{morale:0}).meetings[0].preference,0);
 assert.equal(meetingSnapshot(m,['meet_spd_Owned[000]']).meetings[0].preference,-1);
 for(const missingClues of [[],[1,2,3,4,5,6,7]])assert.equal(meetingSnapshot(meetingModel({missingClues}),['meet_spd_notOwned[010]']).meetings[0].preference,0);
});
test('meeting solo cost applies only when alone; ramp respects elapsed assignment time',()=>{
 const m=meetingModel(),id='meet_spd&cost_condChar[000]';
 const solo=meetingSnapshot(m,[id]);assert.equal(solo.rates[0],-3);assert.ok(Math.abs(solo.meetings[0].multiplier-2.01)<1e-8);
 const partner={...m.pool[1],elite:0,rarity:2,skills:[]},pair=meetingSnapshot(m,[id],{partner});assert.equal(pair.rates[0],-1);assert.ok(Math.abs(pair.meetings[0].multiplier-1.56)<1e-8);
 assert.ok(Math.abs(meetingSnapshot(m,['meet_spd_hast[000]'],{worked:8}).meetings[0].multiplier-1.81)<1e-8);
});
test('meeting stateful/unknown probability effects remain explicitly unsupported',()=>{
 for(const id of ['meet_flag[010]','meet_spd&condChar_mustget[000]','meet_spd&exchange[000]','meet_spd&clue[000]'])assert.equal(compileSkill(data.buffs[id]).kind,'unsupported');
});
test('meeting preference and speed integrate through fatigue and rest for two and three shifts',()=>{
 for(const teams of [2,3]){
  const m=meetingModel({teams});
  for(const op of m.pool.slice(0,teams))op.skills=[compileSkill(data.buffs['meet_spd_notOwned[010]'])];
  const p={rooms:m.rooms.filter(r=>r.type!=='DORMITORY'),teams:Array.from({length:teams},(_,i)=>[[i],[null]]),residents:[],support:[]};
  const r=simulatePlan(m,p,{cycles:4,record:true});assert.equal(r.valid,true);assert.equal(r.score[0],0);assert.ok(Math.abs(r.score[1]-1)<1e-8);assert.ok(r.score[2]>1);
  assert.ok(r.stages.every(s=>s.products.MEETING>0&&Math.abs(s.products.MEETING_PREFERENCE-12)<1e-8));
 }
 assert.equal(compareScores([1.5,0,0,0,0,0],[1.49,1,100,1e9,0,0]),1);
 assert.equal(compareScores([1.5,1,1,0,0,0],[1.5,0,100,1e9,0,0]),1);
 assert.equal(compareScores([1.5,1,1.6,0,0,0],[1.5,1,1.59,1e9,0,0]),1);
});
test('missing clue settings normalize, survive storage schema and exclude invalid IDs',()=>{
 assert.deepEqual(normalizeOptions({missingClues:[7,4,4,8,'1',0]}).missingClues,[4,7]);assert.deepEqual(normalizeOptions({missingClues:[]}).missingClues,[]);
 const html=fs.readFileSync(new URL('../base.html',import.meta.url),'utf8');assert.ok(html.includes('id="optimizerMissingClues"'));assert.ok(html.includes('id="optimizerHelp"'));assert.ok(!html.includes('id="optimizerEngine"'));assert.ok(!html.includes('사무실·응접실 다음'));
});
test('meeting control buffs affect speed and missing preference only while active',()=>{
 const m=meetingModel({missingClues:[5]}),values=Float64Array.from(m.pool,()=>24),work=new Float64Array(m.pool.length);
 const target={...m.pool[0],elite:2,rarity:5,skills:[compileSkill(data.buffs['meet_spd[000]'])]};
 const provider={...m.pool[1],skills:['control_upMeetingSpeed[000]','control_meeting_spd&bd[000]','control_clue_faction[070]'].map(id=>compileSkill(data.buffs[id]))};
 const placements=[{room:m.rooms[0],ops:[target]},{room:{id:'cc',type:'CONTROL',level:5},ops:[provider]}];
 const s=evaluateSnapshot(m,placements,values,work);assert.ok(Math.abs(s.meetings[0].multiplier-1.85)<1e-8);assert.equal(s.meetings[0].preference,1);
 values[provider.index]=0;const exhausted=evaluateSnapshot(m,placements,values,work);assert.ok(Math.abs(exhausted.meetings[0].multiplier-1.6)<1e-8);assert.equal(exhausted.meetings[0].preference,0);
});
