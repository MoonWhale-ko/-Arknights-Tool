import test from 'node:test';
import assert from 'node:assert/strict';
import {enableDragScroll} from '../assets/js/drag-scroll.mjs';
function fixture({overflow=true}={}){
 const host=new EventTarget(),element=new EventTarget(),classes=new Set(),captures=new Set();
 Object.assign(element,{ownerDocument:{defaultView:host},clientWidth:500,clientHeight:300,scrollWidth:overflow?2000:500,scrollLeft:100,classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)},getBoundingClientRect:()=>({left:0,top:0}),setPointerCapture:id=>captures.add(id),hasPointerCapture:id=>captures.has(id),releasePointerCapture:id=>captures.delete(id)});
 const cleanup=enableDragScroll(element);
 function fire(type,properties={},on=element){const event=new Event(type,{cancelable:true});Object.assign(event,{pointerType:'mouse',pointerId:1,isPrimary:true,button:0,buttons:1,clientX:200,clientY:100,...properties});on.dispatchEvent(event);return event;}
 return{host,element,classes,captures,fire,cleanup};
}
test('horizontal mouse drag moves items and suppresses the following detail click',()=>{
 const {element,fire,host,classes,captures}=fixture();fire('pointerdown');
 const move=fire('pointermove',{clientX:100});assert.equal(element.scrollLeft,200);assert(move.defaultPrevented);assert(classes.has('is-dragging'));assert(captures.has(1));
 fire('pointerup',{},host);assert(!classes.has('is-dragging'));assert(!captures.size);
 assert(fire('click',{detail:1}).defaultPrevented);
 fire('pointerdown');fire('pointerup',{},host);assert(!fire('click',{detail:1}).defaultPrevented);
});
test('tiny movements and vertical gestures keep regular item clicks',()=>{
 for(const coordinates of [{clientX:197,clientY:101},{clientX:196,clientY:140}]){
  const {element,fire,host}=fixture();fire('pointerdown');fire('pointermove',coordinates);fire('pointerup',{},host);assert.equal(element.scrollLeft,100);assert(!fire('click',{detail:1}).defaultPrevented);
 }
});
test('touch, secondary mouse buttons and nonoverflowing lists keep native behavior',()=>{
 for(const props of [{pointerType:'touch'},{button:2},{isPrimary:false}]){
  const {element,fire}=fixture();fire('pointerdown',props);assert(!fire('pointermove',{...props,clientX:100}).defaultPrevented);assert.equal(element.scrollLeft,100);
 }
 const {element,fire}=fixture({overflow:false});fire('pointerdown');fire('pointermove',{clientX:100});assert.equal(element.scrollLeft,100);
});
test('cancel, lost capture and window blur release the drag without trapping a later click',()=>{
 for(const type of ['pointercancel','lostpointercapture','blur']){
  const {fire,host,element,classes,captures}=fixture();fire('pointerdown');fire('pointermove',{clientX:100});fire(type,{},type==='lostpointercapture'?element:host);assert(!classes.has('is-dragging'));assert(!captures.size);
  fire('pointerdown');fire('pointerup',{},host);assert(!fire('click',{detail:1}).defaultPrevented);
 }
});
test('another pointer cannot take over, and keyboard activation still works after a drag',()=>{
 const {element,fire,host,classes}=fixture();fire('pointerdown');fire('pointermove',{pointerId:2,clientX:100});assert.equal(element.scrollLeft,100);
 fire('pointermove',{clientX:100});fire('pointerup',{pointerId:2},host);assert(classes.has('is-dragging'));
 fire('pointerup',{},host);assert(!fire('click',{detail:0}).defaultPrevented);
});
test('native scrollbars, links and form inputs are not captured',()=>{
 for(const props of [{clientY:301},{clientX:501}]){const {fire,element}=fixture();fire('pointerdown',props);fire('pointermove',{clientX:100});assert.equal(element.scrollLeft,100);}
 const {fire,element}=fixture();element.closest=()=>({});fire('pointerdown');fire('pointermove',{clientX:100});assert.equal(element.scrollLeft,100);
});
