import test from 'node:test';
import assert from 'node:assert/strict';
import {GUIDES,panelPosition,shadeRects,interactionChanged} from '../assets/js/guide-tour.mjs';
test('practice completes only when the actual control state changes',()=>{
 assert.equal(interactionChanged('false','true'),true);
 assert.equal(interactionChanged('true','false'),true);
 assert.equal(interactionChanged('false','false'),false);
 assert.equal(interactionChanged(null,'true'),false);
 assert.equal(interactionChanged('true',null),false);
});
test('four shields cover exactly the area outside the interactive spotlight',()=>{
 for(const [width,height] of [[1440,900],[390,844],[320,480],[844,390]]){
  const hole={left:20,top:80,right:width-20,bottom:height-80};
  const shields=shadeRects(hole,width,height);
  assert.equal(shields.length,4);
  assert.equal(shields.reduce((n,r)=>n+r.width*r.height,0),width*height-(hole.right-hole.left)*(hole.bottom-hole.top));
  for(const r of shields){assert(r.width>=0&&r.height>=0);assert(r.left>=0&&r.top>=0);assert(r.left+r.width<=width);assert(r.top+r.height<=height);}
 }
});
test('offscreen targets never leave negative shield bounds',()=>{
 for(const hole of [{left:-50,top:-50,right:500,bottom:1000},{left:500,top:1000,right:600,bottom:1200}]){
  for(const r of shadeRects(hole,390,844)){assert(r.width>=0&&r.height>=0);assert(r.left+r.width<=390);assert(r.top+r.height<=844);}
 }
});
test('guide panel fits beside the spotlight on desktop, portrait and landscape',()=>{
 for(const [width,height] of [[1440,900],[390,844],[320,480],[844,390]]){
  const panel={width:Math.min(360,width-24),height:300};
  const p=panelPosition({left:20,top:100,right:200,bottom:160},panel,width,height);
  assert(p.left>=12&&p.top>=12);assert(p.left+panel.width<=width-12);assert(p.top+panel.height<=height-12);
 }
});
test('each practice has its own instruction and result explanation',()=>{
 let count=0;
 for(const guide of Object.values(GUIDES))for(const step of guide.steps){
  const action=step[3];assert(step[0]&&step[1]);if(!action){assert(step[2]);continue;}
  count++;assert.equal(action.event,'click');assert(action.match&&action.attribute&&action.prompt&&action.resultText&&action.resultTitle);
 }
 assert.equal(count,4);
});
