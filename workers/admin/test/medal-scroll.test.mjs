import test from 'node:test';import assert from 'node:assert/strict';
import {activeCategory,momentumStep} from '../public/medals/medal-scroll.mjs';
test('category stays active until its last visible item has left the viewport',()=>{const sections=[{id:'career',bottom:101},{id:'episode',bottom:400}];assert.equal(activeCategory(sections,99),'career');assert.equal(activeCategory(sections,101),'episode');assert.equal(activeCategory([],0),'');});
test('momentum slows progressively and is independent of frame splitting',()=>{const a=momentumStep(2,16),b=momentumStep(a.velocity,16),whole=momentumStep(2,32);assert.ok(a.velocity<2&&a.velocity>0);assert.ok(b.velocity<a.velocity);assert.ok(Math.abs(a.distance+b.distance-whole.distance)<1e-9);assert.ok(Math.abs(b.velocity-whole.velocity)<1e-9);assert.equal(momentumStep(0,16).distance,0);});

test('a fast release retains momentum despite a tiny trailing movement',async()=>{const {releaseVelocity}=await import('../public/medals/medal-scroll.mjs');const samples=[{t:0,y:400},{t:40,y:300},{t:80,y:200},{t:90,y:199}];assert.ok(releaseVelocity(samples,100)>2);assert.equal(releaseVelocity(samples,250),0);assert.ok(releaseVelocity([{t:0,y:0},{t:80,y:160}],90)<0);});
test('a flick travels beyond one short viewport while decelerating',()=>{let velocity=2,distance=0;for(let t=0;t<1500;t+=16){const step=momentumStep(velocity,16);velocity=step.velocity;distance+=step.distance;}assert.ok(distance>950);assert.ok(velocity<.15);});

test('wheel input clears stale drags and mouse movement without a pressed button cannot scroll',async()=>{
 const {enableMedalDrag}=await import('../public/medals/medal-scroll.mjs');const old=globalThis.cancelAnimationFrame;globalThis.cancelAnimationFrame=()=>{};
 try{const handlers=new Map(),captures=new Set();const root={scrollTop:0,classList:{add(){},remove(){}},addEventListener(name,fn){handlers.set(name,fn);},scrollTo({top}){this.scrollTop=top;},setPointerCapture(id){captures.add(id);},hasPointerCapture(id){return captures.has(id);},releasePointerCapture(id){captures.delete(id);}};enableMedalDrag(root);
 const event=(y,buttons=1)=>({pointerId:1,pointerType:'mouse',button:0,buttons,clientY:y,target:{closest:()=>null},preventDefault(){}});
 handlers.get('pointerdown')(event(100));handlers.get('pointermove')(event(80,0));assert.equal(root.scrollTop,0);
 handlers.get('pointerdown')(event(100));handlers.get('pointermove')(event(80));assert.equal(root.scrollTop,20);handlers.get('wheel')({});assert.equal(captures.size,0);handlers.get('pointermove')(event(40));assert.equal(root.scrollTop,20);
 handlers.get('pointerdown')(event(100));handlers.get('pointerleave')({});handlers.get('pointermove')(event(40));assert.equal(root.scrollTop,20);
 }finally{if(old===undefined)delete globalThis.cancelAnimationFrame;else globalThis.cancelAnimationFrame=old;}
});
