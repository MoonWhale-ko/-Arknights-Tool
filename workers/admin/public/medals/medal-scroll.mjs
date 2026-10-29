export function activeCategory(sections,top){return sections.find(s=>s.bottom>top+1)?.id??sections.at(-1)?.id??'';}
export function momentumStep(velocity,dt){const friction=.0018,decay=Math.exp(-friction*Math.max(0,dt));return {distance:velocity*(1-decay)/friction,velocity:velocity*decay};}
export function releaseVelocity(samples,now){
 const last=samples.at(-1);if(!last||now-last.t>140)return 0;
 const recent=samples.filter(s=>s.t>=last.t-100);if(recent.length<2)return 0;
 const first=recent[0],dt=last.t-first.t;if(dt<8)return 0;
 return Math.max(-6,Math.min(6,(first.y-last.y)/dt*1.25));
}
export function enableMedalDrag(root){
 let frame=0,down=null,velocity=0,suppress=false;
 const stop=()=>{cancelAnimationFrame(frame);frame=0;velocity=0;};
 root.addEventListener('wheel',stop,{passive:true});root.addEventListener('dragstart',e=>e.preventDefault());
 root.addEventListener('pointerdown',e=>{if(e.button!==0||e.pointerType==='touch'||e.target.closest('input,select,a'))return;stop();root.scrollTo({top:root.scrollTop,behavior:'instant'});down={id:e.pointerId,start:e.clientY,y:e.clientY,moved:false,samples:[{y:e.clientY,t:performance.now()}]};});
 root.addEventListener('pointermove',e=>{if(!down||e.pointerId!==down.id)return;const now=performance.now(),dy=down.y-e.clientY;if(!down.moved&&Math.abs(e.clientY-down.start)<5)return;if(!down.moved){down.moved=true;root.setPointerCapture(e.pointerId);root.classList.add('is-dragging');}e.preventDefault();root.scrollTop+=dy;down.y=e.clientY;down.samples.push({y:e.clientY,t:now});down.samples=down.samples.filter(s=>s.t>=now-140);});
 const finish=e=>{if(!down||e.pointerId!==down.id)return;const moved=down.moved;velocity=releaseVelocity(down.samples,performance.now());down=null;root.classList.remove('is-dragging');if(root.hasPointerCapture(e.pointerId))root.releasePointerCapture(e.pointerId);if(!moved)return;suppress=true;setTimeout(()=>suppress=false,0);if(e.type==='pointercancel')return;let last=performance.now();const tick=now=>{const step=momentumStep(velocity,Math.min(64,now-last)),before=root.scrollTop;root.scrollTop+=step.distance;velocity=step.velocity;last=now;if(Math.abs(velocity)>.025&&Math.abs(root.scrollTop-before)>.01)frame=requestAnimationFrame(tick);else stop();};frame=requestAnimationFrame(tick);};
 root.addEventListener('pointerup',finish);root.addEventListener('pointercancel',finish);root.addEventListener('lostpointercapture',()=>{if(down){down=null;root.classList.remove('is-dragging');}});
 root.addEventListener('click',e=>{if(suppress){e.preventDefault();e.stopImmediatePropagation();}},{capture:true});return stop;
}
