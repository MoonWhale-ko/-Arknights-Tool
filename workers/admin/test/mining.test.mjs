import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calculate,totals} from '../public/mining/engine.mjs';
const stage=(id,extra={})=>({id,op:1,start:0,end:-1,...extra});
const cat={stages:[stage('normal'),stage('challenge'),stage('two'),stage('missing'),stage('expired',{end:10}),stage('future',{start:200})],medals:[]};
test('separates missing records, 2-star clears, challenge and closed events',()=>{
 const rows=calculate(cat,{user:{dungeon:{stages:{normal:{state:3},challenge:{state:0},two:{state:2,completeTimes:1}}}}},{now:100});
 assert.deepEqual(totals(rows),{remaining:2,claimed:1,unknown:1,total:4});
 assert.equal(rows.find(x=>x.id==='two').status,'remaining');
});
test('only complete exact medal groups prove individual clears',()=>{
 const catalog={stages:[stage('a'),stage('b')],medals:[{id:'m',count:2,stages:['a','b']}]};
 const user={dungeon:{stages:{}},medal:{medals:{m:{val:[[1,2]]}}}};
 assert.equal(totals(calculate(catalog,{user})).unknown,2);
 user.medal.medals.m.val=[[2,2]];
 assert.equal(totals(calculate(catalog,{user})).claimed,2);
});
test('manual checks change totals without modifying account',()=>{
 const data={snapshot:{user:{dungeon:{stages:{}}}}};
 assert.equal(totals(calculate(cat,data,{now:100,overrides:{missing:'remaining'}})).remaining,1);
 assert.deepEqual(data.snapshot.user.dungeon.stages,{});
 assert.throws(()=>calculate(cat,{}),/dungeon/);
});
