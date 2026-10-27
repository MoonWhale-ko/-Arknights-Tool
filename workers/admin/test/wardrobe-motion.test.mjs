import test from 'node:test';import assert from 'node:assert/strict';
import {NATIVE_MOTION,nativeCardFrames,nativeDragState,leftMotionChannels} from '../public/wardrobe/original-layout.js';
test('native cards keep a centred selected bound and continuously fold their neighbors',()=>{
 const settled=nativeCardFrames(2,5);assert.equal(settled[2].x,0);assert.equal(settled[2].opacity,1);assert.equal(settled[1].width,NATIVE_MOTION.boundWidth*.5);assert.ok(Math.abs(settled[0].wash-.28)<1e-12);
 const a=nativeCardFrames(2.999999,5),b=nativeCardFrames(3,5);for(let i=0;i<5;i++){assert.ok(Math.abs(a[i].x-b[i].x)<.001);assert.ok(Math.abs(a[i].width-b[i].width)<.001);}
});
test('native timing, edge slots and drag clamps remain stable',()=>{
 assert.equal(NATIVE_MOTION.clickFrames,15);assert.equal(NATIVE_MOTION.snapFrames,5);assert.equal(nativeCardFrames(0,1)[0].x,0);assert.equal(nativeDragState(0,1000,5),0);assert.equal(nativeDragState(2,-1000,5),4);assert.equal(nativeDragState(2,100,5),1.97);
});

test('left scene follows original Show/Hide endpoints through squared distance',()=>{
 const channel=(distance,path,attribute)=>leftMotionChannels(distance).find(c=>c.path===path&&c.attribute===attribute).value[0];
 assert.ok(Math.abs(channel(0,'illustration','m_AnchoredPosition.y')-19.6)<1e-5);
 assert.equal(channel(1,'illustration','m_AnchoredPosition.y'),-674);
 assert.equal(channel(.5,'','m_Alpha'),.75);
 assert.equal(channel(-.5,'','m_Alpha'),.75);
 assert.equal(channel(5,'','m_Alpha'),0);
 assert.ok(Math.abs(channel(.5,'spine_part/spine_holder','m_AnchoredPosition.x')+93)<1e-5);
});
