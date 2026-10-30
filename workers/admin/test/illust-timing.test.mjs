import test from 'node:test';
import assert from 'node:assert/strict';
import {specialDelay,motionNames} from '../public/wardrobe/illust-timing.mjs';
test('native initial timer adds short rounded idle duration and excludes upper bound',()=>{
 assert.equal(specialDelay(true,4.2,()=>0),7);
 assert.equal(specialDelay(true,4.5,()=>0),7);
 assert.equal(specialDelay(true,5.5,()=>0),9);
 assert.equal(specialDelay(true,4.2,()=>.999999),12);
 assert.equal(specialDelay(true,9,()=>0),3);
 assert.equal(specialDelay(true,12,()=>.999999),8);
});
test('resume timer after special or interaction uses 10 through 23 seconds',()=>{
 assert.equal(specialDelay(false,4,()=>0),10);
 assert.equal(specialDelay(false,4,()=>.999999),23);
});
test('motion groups omit empty clips and keep variant special and interaction motions',()=>{
 const n=motionNames([{name:'Idle',duration:4},{name:'Special',duration:8},{name:'Special_2',duration:5},{name:'Interact',duration:3},{name:'Special_empty',duration:0}]);
 assert.equal(n.idle.name,'Idle');assert.equal(n.special.length,2);assert.equal(n.interact.length,1);
});
