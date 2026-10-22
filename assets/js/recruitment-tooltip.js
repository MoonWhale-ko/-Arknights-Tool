/* Show each operator's existing recruitment tags without changing calculation. */
(()=>{
 'use strict';
 const results=document.getElementById('results');if(!results)return;
 const tooltip=document.createElement('div');tooltip.id='recruitOperatorTooltip';tooltip.className='recruit-op-tooltip';tooltip.setAttribute('role','tooltip');tooltip.hidden=true;document.body.append(tooltip);
 let anchor=null,timer;
 const operator=target=>target instanceof Element?target.closest('.op[data-recruit-tags]'):null;
 function hide(){clearTimeout(timer);if(anchor)anchor.removeAttribute('aria-describedby');anchor=null;tooltip.hidden=true;}
 function place(){
  if(!anchor?.isConnected){hide();return;}
  const r=anchor.getBoundingClientRect(),t=tooltip.getBoundingClientRect();
  const left=Math.max(12,Math.min(innerWidth-t.width-12,r.left+(r.width-t.width)/2));
  let top=r.bottom+10;if(top+t.height>innerHeight-12)top=r.top-t.height-10;
  top=Math.max(12,Math.min(innerHeight-t.height-12,top));
  tooltip.style.left=left+'px';tooltip.style.top=top+'px';
 }
 function show(card){
  clearTimeout(timer);
  if(anchor===card&&!tooltip.hidden)return;
  hide();
  let tags;try{tags=JSON.parse(card.dataset.recruitTags);}catch{return;}
  if(!Array.isArray(tags)||!tags.length)return;
  anchor=card;
  const name=document.createElement('strong');name.textContent=card.dataset.recruitName;
  const label=document.createElement('span');label.className='recruit-tooltip-label';label.textContent='모집 태그';
  const list=document.createElement('div');list.className='recruit-tooltip-tags';
  const selected=new Set([...document.querySelectorAll('.tag.on')].map(n=>n.dataset.tag));
  for(const tag of tags){const chip=document.createElement('span');chip.className='recruit-tooltip-tag'+(selected.has(tag)?' is-selected':'');chip.textContent=tag;list.append(chip);}
  tooltip.replaceChildren(name,label,list);tooltip.hidden=false;anchor.setAttribute('aria-describedby',tooltip.id);place();
 }
 function scheduleHide(){clearTimeout(timer);timer=setTimeout(()=>{if(anchor?.matches(':hover,:focus')||tooltip.matches(':hover'))return;hide();},120);}
 results.addEventListener('pointermove',event=>{if(event.pointerType==='touch')return;const card=operator(event.target);if(card&&results.contains(card))show(card);});
 results.addEventListener('pointerout',event=>{const card=operator(event.target);if(!card||card.contains(event.relatedTarget)||tooltip.contains(event.relatedTarget))return;scheduleHide();});
 results.addEventListener('focusin',event=>{const card=operator(event.target);if(card)show(card);});
 results.addEventListener('focusout',scheduleHide);
 tooltip.addEventListener('pointerenter',()=>clearTimeout(timer));tooltip.addEventListener('pointerleave',scheduleHide);
 document.addEventListener('focusin',event=>{if(anchor&&!anchor.contains(event.target)&&!tooltip.contains(event.target))hide();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape')hide();});
 document.addEventListener('scroll',hide,true);window.addEventListener('resize',hide);
 new MutationObserver(()=>{if(anchor&&!anchor.isConnected)hide();}).observe(results,{childList:true,subtree:true});
})();
