import test from 'node:test';import assert from 'node:assert/strict';
import {NATIVE_MOTION,nativeCardFrames,nativeDragState} from '../public/wardrobe/original-layout.js';
test('native cards keep a centred selected bound and continuously fold their neighbors',()=>{
 const settled=nativeCardFrames(2,5);assert.equal(settled[2].x,0);assert.equal(settled[2].opacity,1);assert.equal(settled[1].width,NATIVE_MOTION.boundWidth*.5);assert.ok(Math.abs(settled[0].wash-.28)<1e-12);
 const a=nativeCardFrames(2.999999,5),b=nativeCardFrames(3,5);for(let i=0;i<5;i++){assert.ok(Math.abs(a[i].x-b[i].x)<.001);assert.ok(Math.abs(a[i].width-b[i].width)<.001);}
});
test('native timing, edge slots and drag clamps remain stable',()=>{
 assert.equal(NATIVE_MOTION.clickFrames,15);assert.equal(NATIVE_MOTION.snapFrames,5);assert.equal(nativeCardFrames(0,1)[0].x,0);assert.equal(nativeDragState(0,1000,5),0);assert.equal(nativeDragState(2,-1000,5),4);assert.equal(nativeDragState(2,100,5),1.97);
});
