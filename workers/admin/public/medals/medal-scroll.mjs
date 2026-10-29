export function activeCategory(sections,top){return sections.find(s=>s.bottom>top+1)?.id??sections.at(-1)?.id??'';}
export function momentumStep(velocity,dt){const decay=Math.exp(-.004*Math.max(0,dt));return {distance:velocity*(1-decay)/.004,velocity:velocity*decay};}
export function enableMedalDrag(root){
 let frame=0,down=null,velocity=0,suppress=false;
 const stop=()=>{cancelAnimationFrame(frame);frame=0;velocity=0;};
 root.addEventListener('wheel',stop,{passive:true});
 root.addEventListener('dragstart',e=>e.preventDefault());
 root.addEventListener('pointerdown',e=>{if(e.button!==0||e.pointerType==='touch'||e.target.closest('input,select,a'))return;stop();root.scrollTo({top:root.scrollTop,behavior:'instant'});down={id:e.pointerId,start:e.clientY,y:e.clientY,t:performance.now(),moved:false};});
 root.addEventListener('pointermove',e=>{if(!down||e.pointerId!==down.id)return;const now=performance.now(),dy=down.y-e.clientY,dt=Math.max(1,now-down.t);if(!down.moved&&Math.abs(e.clientY-down.start)<5)return;if(!down.moved){down.moved=true;root.setPointerCapture(e.pointerId);root.classList.add('is-dragging');}e.preventDefault();root.scrollTop+=dy;velocity=.7*Math.max(-3,Math.min(3,dy/dt))+.3*velocity;down.y=e.clientY;down.t=now;});
 const finish=e=>{if(!down||e.pointerId!==down.id)return;const moved=down.moved;velocity=performance.now()-down.t>100?0:velocity;down=null;root.classList.remove('is-dragging');if(root.hasPointerCapture(e.pointerId))root.releasePointerCapture(e.pointerId);if(!moved)return;suppress=true;setTimeout(()=>suppress=false,0);if(e.type==='pointercancel'||matchMedia('(prefers-reduced-motion: reduce)').matches)return;let last=performance.now();const tick=now=>{const step=momentumStep(velocity,Math.min(40,now-last)),before=root.scrollTop;root.scrollTop+=step.distance;velocity=step.velocity;last=now;if(Math.abs(velocity)>.015&&Math.abs(root.scrollTop-before)>.01)frame=requestAnimationFrame(tick);else stop();};frame=requestAnimationFrame(tick);};
 root.addEventListener('pointerup',finish);root.addEventListener('pointercancel',finish);root.addEventListener('lostpointercapture',()=>{if(down){down=null;root.classList.remove('is-dragging');}});
 root.addEventListener('click',e=>{if(suppress){e.preventDefault();e.stopImmediatePropagation();}},{capture:true});
 return stop;
}
