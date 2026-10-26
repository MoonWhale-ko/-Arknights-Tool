import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calculate,totals} from '../public/mining/engine.mjs';
const stage=(id,extra={})=>({id,op:1,start:0,end:-1,...extra});
const cat={stages:[stage('normal'),stage('challenge'),stage('two'),stage('missing'),stage('expired',{end:10}),stage('future',{start:200})],medals:[]};
test('separates missing records, 2-star clears, challenge and closed events',()=>{
 const rows=calculate(cat,{user:{dungeon:{stages:{normal:{state:3},challenge:{state:0},two:{state:2,completeTimes:1}}}}},{now:100});
 assert.deepEqual(totals(rows),{remaining:3,claimed:1,unknown:0,total:4});
 assert.equal(rows.find(x=>x.id==='two').status,'remaining');
});
test('only complete exact medal groups prove individual clears',()=>{
 const catalog={stages:[stage('a'),stage('b')],medals:[{id:'m',count:2,stages:['a','b']}]};
 const user={dungeon:{stages:{}},medal:{medals:{m:{val:[[1,2]]}}}};
 assert.equal(totals(calculate(catalog,{user})).remaining,2);
 user.medal.medals.m.val=[[2,2]];
 assert.equal(totals(calculate(catalog,{user})).claimed,2);
});
test('manual checks change totals without modifying account',()=>{
 const data={snapshot:{user:{dungeon:{stages:{}}}}};
 assert.equal(totals(calculate(cat,data,{now:100,overrides:{missing:'claimed'}})).remaining,3);
 assert.deepEqual(data.snapshot.user.dungeon.stages,{});
 assert.throws(()=>calculate(cat,{}),/dungeon/);
});

test('KR daily rotation and force-open periods use 04:00 KST reset',()=>{
 const c={stages:[stage('daily',{zone:'weekly',weekdays:[5]})],medals:[],forceOpen:[]};
 const d={user:{dungeon:{stages:{}}}};
 const friday=Date.parse('2026-10-23T04:00:00+09:00')/1000;
 assert.equal(calculate(c,d,{now:friday-1}).length,0);
 assert.equal(calculate(c,d,{now:friday}).length,1);
 c.forceOpen=[{startTime:friday-100,endTime:friday+100,forceOpenList:['weekly']}];
 assert.equal(calculate(c,d,{now:friday-1}).length,1);
});

test('availability distinguishes ended PA, pending rerun, permanent access, future and missing metadata', async()=>{
 const {audit}=await import('../public/mining/engine.mjs');
 const c={medals:[],stages:[
 stage('pa',{category:'event',routes:[{type:'event',start:1,end:10}]}),
 stage('mt',{category:'event',routes:[{type:'event',start:1,end:10}],availabilityHint:'복각 대기'}),
 stage('side',{routes:[{type:'event',start:1,end:10},{type:'permanent',start:20,end:-1}]}),
 stage('future',{routes:[{type:'event',start:200,end:300}]}),
 stage('missing',{routes:[]}),
 stage('story',{kind:'스토리'}),stage('tr',{kind:'튜토리얼'}),stage('no-reward',{op:0}),
 stage('story',{kind:'스토리'})]};
 const result=audit(c,{user:{dungeon:{stages:{}}}},{now:100});
 assert.deepEqual(result.included.map(s=>s.id),['side','story','tr']);
 assert.deepEqual(result.excluded.map(s=>s.exclusion),['기간 종료','복각 대기','개방 예정','개방 정보 부족']);
 assert.equal(totals(result.included).remaining,3);
});

test('prerequisite bounds distinguish locked stages and PASS from three-star proof',async()=>{
 const {stageEvidence}=await import('../public/mining/evidence.mjs');
 const c={graph:{a:{code:'A',requires:[]},b:{code:'B',requires:[{stageId:'a',completeState:'PASS'}]},c:{code:'C',requires:[{stageId:'b',completeState:'PASS'}]},p:{requires:[]},q:{requires:[{stageId:'p',completeState:'PASS'}]},x:{requires:[]},y:{requires:[{stageId:'x',completeState:'COMPLETE'}]}},medals:[]};
 const b=stageEvidence(c,{dungeon:{stages:{a:{state:0},q:{state:3},y:{state:3}}}});
 assert.equal(b.get('c').hi,0);assert.match(b.get('b').reason,/직전 해금 조건: A/);
 assert.equal(b.get('p').lo,2);assert.equal(b.get('x').lo,3);
});
test('harder completions fold down once without granting normal-to-challenge rewards',async()=>{
 const c={stages:[stage('normal'),stage('tough'),stage('easy',{op:0}),stage('challenge'),stage('shared-story')],medals:[],completionLinks:[['tough','normal'],['normal','easy']],graph:{}};
 const rows=calculate(c,{user:{dungeon:{stages:{tough:{state:3},normal:{state:0},'shared-story':{state:3}}}}});
 assert.equal(rows.find(s=>s.id==='normal').status,'claimed');
 assert.equal(rows.find(s=>s.id==='challenge').status,'remaining');
 assert.deepEqual(totals(rows),{claimed:3,remaining:1,unknown:0,total:4});
});
test('simulation first clears and milestone entitlements stay separate; repeated highest stars do not accumulate',async()=>{
 const {audit}=await import('../public/mining/engine.mjs');
 const c={stages:[stage('base'),stage('six')],medals:[],completionLinks:[['six','base']],graph:{},simulation:[{id:'g',stages:['six']}],milestones:[stage('m2',{idType:'milestone',groupId:'g',threshold:2}),stage('m12',{idType:'milestone',groupId:'g',threshold:12})]};
 const user={dungeon:{stages:{six:{state:3,completeTimes:20}},sixStar:{stages:{six:{tagFinish:0}},groups:{g:{point:0,rewards:{m2:{state:0},m12:{state:0}}}}}}};
 let r=audit(c,{user});assert.equal(r.simulation[0].point,0);assert.equal(totals(r.included).claimed,2);assert.equal(r.included.find(s=>s.id==='m2').ready,false);
 user.dungeon.sixStar.stages.six.tagFinish=2;user.dungeon.sixStar.groups.g.point=2;
 r=audit(c,{user});assert.equal(r.simulation[0].derived,2);assert.equal(r.included.find(s=>s.id==='m2').ready,true);assert.equal(totals(r.included).remaining,2);
 user.dungeon.sixStar.groups.g.rewards.m2.state=2;r=audit(c,{user});assert.equal(totals(r.included).claimed,3);
 user.dungeon.sixStar.groups.g.point=3;assert.equal(audit(c,{user}).simulation[0].mismatch,true);
});

test('episode gates classify absent roots but temporary entry never proves the previous episode complete',async()=>{
 const {stageEvidence}=await import('../public/mining/evidence.mjs');
 const c={graph:{previous:{code:'7-20',requires:[]},root:{code:'R8-1',zoneRequires:'previous',requires:[]},child:{requires:[{stageId:'root',completeState:'PASS'}]},temp:{zoneRequires:'previous',entryWindow:{start:10,end:20,requires:'early'},requires:[]},early:{requires:[]}},medals:[]};
 const u={dungeon:{stages:{previous:{state:0},early:{state:3}}}};
 let b=stageEvidence(c,u,15);assert.equal(b.get('root').hi,0);assert.equal(b.get('child').hi,0);assert.match(b.get('root').reason,/에피소드 해금/);assert.equal(b.get('temp').hi,3);
 b=stageEvidence(c,u,21);assert.equal(b.get('temp').hi,0);
 u.dungeon.stages.temp={state:3};b=stageEvidence(c,u,15);assert.equal(b.get('previous').lo,0);assert.equal(b.get('temp').lo,3);
});

test('direct unlock requirements stay distinct from chapter entry and retain tutorial steps',()=>{
 const catalog={stages:[stage('target',{code:'16-3',mode:'추가 조건 작전'})],graph:{chapter:{code:'15-21',requires:[]},previous:{code:'16-2',requires:[],zoneRequires:'chapter'},tutorial:{code:'TR-27',requires:[{stageId:'previous',completeState:'PASS'}],zoneRequires:'chapter'},target:{code:'16-3',requires:[{stageId:'tutorial',completeState:'PASS'}],zoneRequires:'chapter'}},medals:[]};
 const data={user:{dungeon:{stages:{chapter:{state:0}}}}};
 let row=calculate(catalog,data,{now:100})[0];
 assert.equal(row.access,'TR-27 클리어 필요');
 assert.match(row.reason,/TR-27/);
 assert.ok(row.unlockDetails.some(s=>s.includes('16-2 → TR-27 → 16-3')));
 assert.ok(row.unlockDetails.some(s=>s.includes('에피소드 진입 조건: 15-21')));
 assert.equal(row.mode,'험지 작전');
 data.user.dungeon.stages.tutorial={state:2};
 row=calculate(catalog,data,{now:100})[0];assert.match(row.access,/15-21.*에피소드 진입/);
 data.user.dungeon.stages.chapter={state:2};row=calculate(catalog,data,{now:100})[0];assert.equal(row.access,'개방 중');
 catalog.graph.target.requires=[{stageId:'tutorial',completeState:'COMPLETE'}];row=calculate(catalog,data,{now:100})[0];assert.equal(row.access,'TR-27 3성 클리어 필요');
});
