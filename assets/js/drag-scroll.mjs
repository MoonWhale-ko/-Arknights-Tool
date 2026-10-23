// Mouse grab scrolling; touch and trackpad scrolling keep their native behavior.
export function enableDragScroll(viewport,{threshold=6}={}){
 const host=viewport.ownerDocument.defaultView;
 let gesture=null,suppressClick=false;
 function finish(event){
  if(!gesture||event?.pointerId!==undefined&&event.pointerId!==gesture.id)return;
  const ended=gesture;gesture=null;
  viewport.classList.remove('is-dragging');
  if(ended.dragging){suppressClick=true;event?.preventDefault();}
  if(viewport.hasPointerCapture?.(ended.id))viewport.releasePointerCapture(ended.id);
 }
 function down(event){
  // A fresh press always clears suppression from a previous drag or cancellation.
  if(event.pointerType!=='mouse'||event.button!==0||!event.isPrimary||gesture)return;
  suppressClick=false;
  if(event.ctrlKey||event.altKey||event.metaKey||viewport.scrollWidth<=viewport.clientWidth)return;
  if(event.target.closest?.('input,select,textarea,a,[contenteditable=true]'))return;
  const rect=viewport.getBoundingClientRect();
  // Leave native scrollbar gestures alone.
  if(event.clientX>=rect.left+viewport.clientWidth||event.clientY>=rect.top+viewport.clientHeight)return;
  gesture={id:event.pointerId,x:event.clientX,y:event.clientY,scroll:viewport.scrollLeft,dragging:false};
 }
 function move(event){
  if(!gesture||event.pointerId!==gesture.id)return;
  if(!(event.buttons&1)){finish(event);return;}
  const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
  if(!gesture.dragging){
   if(Math.abs(dx)<threshold||Math.abs(dx)<=Math.abs(dy))return;
   gesture.dragging=true;viewport.classList.add('is-dragging');
   viewport.setPointerCapture(event.pointerId);
  }
  event.preventDefault();viewport.scrollLeft=gesture.scroll-dx;
 }
 function click(event){
  // Keyboard activation must still open item details immediately after a drag.
  if(!suppressClick||event.detail===0)return;
  suppressClick=false;event.preventDefault();event.stopImmediatePropagation();
 }
 const stopNativeDrag=event=>event.preventDefault();
 viewport.addEventListener('pointerdown',down);
 viewport.addEventListener('pointermove',move,{passive:false});
 viewport.addEventListener('lostpointercapture',finish);
 viewport.addEventListener('dragstart',stopNativeDrag);
 viewport.addEventListener('click',click,true);
 host.addEventListener('pointerup',finish,{passive:false});
 host.addEventListener('pointercancel',finish);
 host.addEventListener('blur',finish);
 return ()=>{
  finish();viewport.removeEventListener('pointerdown',down);viewport.removeEventListener('pointermove',move);
  viewport.removeEventListener('lostpointercapture',finish);viewport.removeEventListener('dragstart',stopNativeDrag);viewport.removeEventListener('click',click,true);
  host.removeEventListener('pointerup',finish);host.removeEventListener('pointercancel',finish);host.removeEventListener('blur',finish);
 };
}
