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
