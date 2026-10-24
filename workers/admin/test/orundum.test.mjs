import {test} from 'node:test';import assert from 'node:assert/strict';import {calculate,gameWeek,summarize} from '../public/orundum/engine.mjs';
const now=Date.parse('2026-10-24T06:00:00Z')/1000;
const p=(id,charId,unlock=[])=>({id,charId,name:id,title:id,amount:200,unlock,start:0});
const data=()=>({importedAt:'2026-10-24T05:00:00Z',user:{troop:{chars:{'1':{charId:'a',evolvePhase:2,level:1}},addon:{}},campaignsV2:{instances:{},campaignCurrentFee:1560,campaignTotalFee:1675}}});
test('paradox includes owned training targets, respects elite-level ordering and excludes unowned and future releases',()=>{
 const c={paradox:[p('ready','a',[{unlockType:'AWAKE',unlockParam1:'1',unlockParam2:'55'}]),p('train','a',[{unlockType:'AWAKE',unlockParam1:'2',unlockParam2:'60'}]),p('unowned','b'),{...p('future','a'),start:now+1}],annihilation:[]};
 const r=calculate(c,data(),{now});assert.equal(r.totals.remaining,400);assert.equal(r.rows[0].access,'바로 도전 가능');assert.equal(r.rows[1].access,'육성 후 도전 가능');assert.equal(r.excluded.length,2);
 const d=data();d.user.troop.addon={a:{stage:{ready:{state:3},train:{state:1}}}};assert.equal(calculate(c,d,{now}).totals.claimed,200);
});
test('annihilation preserves original reward-array index and deduplicates overlapping open windows',()=>{
 const c={paradox:[],annihilation:[{id:'camp',name:'camp',windows:[{start:0,end:now+1,kind:'의뢰'},{start:0,end:now+1,kind:'모의'}],rewards:[{index:1,kills:200,amount:300},{index:3,kills:300,amount:400}]},{id:'closed',windows:[{start:0,end:1}],rewards:[]}]};
 const d=data();d.user.campaignsV2.instances.camp={maxKills:400,rewardStatus:[0,1,0,0]};const r=calculate(c,d,{now});assert.equal(r.rows.length,2);assert.deepEqual(r.totals,{remaining:400,claimed:300,unknown:0});assert.equal(r.rows[1].access,'달성 · 보상 수령 가능');assert.equal(r.excluded.length,1);
 d.user.campaignsV2.instances.camp.rewardStatus=[];assert.equal(calculate(c,d,{now}).totals.unknown,700);
});
test('weekly Orundum stays separate and old-week snapshots never produce a current remaining amount',()=>{
 const c={paradox:[],annihilation:[]},d=data();const r=calculate(c,d,{now});assert.equal(r.weekly.remaining,115);assert.equal(r.totals.remaining,0);
 assert.equal(calculate(c,{...d,importedAt:'2026-10-16T05:00:00Z'},{now}).weekly.remaining,null);
 const reset=Date.parse('2026-10-26T04:00:00+09:00')/1000;assert.notEqual(gameWeek(reset-1),gameWeek(reset));
});
test('invalid exports fail without treating all rewards as unclaimed',()=>{assert.throws(()=>calculate({paradox:[],annihilation:[]},{snapshot:{user:{}}}),/계정 원본/);});

test('additional rewards keep mission receipts, expiring event days and conditional shop budgets distinct',async()=>{
 const {additional,gameDay}=await import('../public/orundum/additional.mjs');
 const d=data();d.user.mission={missionRewards:{dailyPoint:0,weeklyPoint:0,rewards:{DAILY:{tier:1},WEEKLY:{week:0}}}};
 d.user.activity={CHECKIN_ACCESS:{event:{rewardsCount:1,currentStatus:0,lastTs:now}}};d.user.shop={LS:{curGroupId:'g1',info:[{id:'good',count:2}]},ES:{info:[]}};d.user.status={lggShard:80};
 d.supplementary={shops:{LS:{groups:['g1','g2'],goodList:[{goodId:'good',groupId:'g1',availCount:6,price:40,item:{id:'4003',count:100}},{goodId:'unlimited',groupId:'g2',availCount:-1,price:50,item:{id:'4003',count:30}}]}}};
 const c={missionRewards:[{id:'tier',type:'DAILY',group:'daily',cost:1,threshold:1,amount:100},{id:'week',type:'WEEKLY',group:'w',cost:1,threshold:1,amount:500,start:0,end:now+1}],dailyPeriods:[{startTime:0,endTime:now+1,periodList:[{period:[1,2,3,4,5,6,7],rewardGroupId:'daily'}]}],events:[{id:'event',name:'event',type:'CHECKIN_ACCESS',perDay:200,days:30,start:0,end:now+86400,rewardEnd:now+86400,rewards:[]},{id:'random',name:'random',type:'PRAY_ONLY',random:true,start:0,end:now+100,rewardEnd:now+100}],monthly:[],subscriptions:[]};
 const r=additional(c,d,now);assert.equal(r.rewards.find(x=>x.id==='tier').status,'claimed');assert.equal(r.rewards.find(x=>x.id==='week').status,'remaining');assert.equal(r.rewards.find(x=>x.id==='event').amount,200);assert.equal(r.random.length,1);assert.equal(r.shops[0].amount,400);assert.equal(r.shops[0].affordable,200);assert.equal(r.shops[1].amount,null);assert.equal(r.shops[1].affordable,null);assert.equal(r.totals.remaining,700);
 const stale=additional(c,{...d,importedAt:'2026-10-23T05:00:00Z'},now);assert.equal(stale.rewards.find(x=>x.id==='tier').status,'unknown');
});
