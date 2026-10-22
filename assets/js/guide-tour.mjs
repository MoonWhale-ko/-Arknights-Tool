// Add detailed copy here when each feature guide is written.
export const GUIDES={
 recruitment:{page:'recruitment.html',name:'공개모집 계산기',steps:[['#tagSearch','태그 앞글자 검색'],['.recruit-time','모집 시간'],['#tagArea','태그 선택'],['#settingsBtn','추가 설정'],['.results-header','모집 결과']]},
 operators:{page:'operators.html',name:'오퍼레이터',steps:[['#q','오퍼레이터 검색'],['#ownedFilter','보유 여부'],['#rarityOptions','등급 선택'],['.profession-picker','직군 선택'],['.plan-link','육성 계획'],['#exportPng','PNG 출력']]},
 plans:{page:'plans.html',name:'육성 계획',steps:[['#q','오퍼레이터 검색'],['#ownedFilter','보유 여부'],['#futureOnly','미래시'],['#rarityOptions','등급 선택'],['#growthOpen','필요 재료 확인']]},
 materials:{page:'materials.html',name:'육성 재료',steps:[['#search','오퍼레이터 선택'],['#content','육성 재료 조회']]},
 backpack:{page:'backpack.html',name:'창고',steps:[['#categories','창고 분류'],['#search','재료 검색'],['#subcategory','세부 분류'],['#ownedOnly','보유·전체 전환'],['#itemViewport','보유 아이템']]},
 base:{page:'base.html',name:'기반시설',steps:[['#baseViewport','기반시설 배치도'],['.optimizer-priority','생산 우선순위'],['#optimizerRotationTitle','교대 조건'],['.optimizer-compute-settings','비교 생산량과 계산 시간'],['#optimizerAdvanced','숙소 인테리어 설정'],['#optimizerRun','현재 육성 기준 계산'],['#optimizerTrainingRun','인프라 스킬 해금 완료 시 계산']]}
};
export function panelPosition(rect,panel,width,height){
 const gap=16,pad=12,w=Math.min(panel.width,width-pad*2),h=Math.min(panel.height,height-pad*2);
 const clamp=(n,min,max)=>Math.max(min,Math.min(n,Math.max(min,max)));
 let x=clamp(rect.left,pad,width-w-pad),y;
 if(rect.bottom+gap+h<=height-pad)y=rect.bottom+gap;
 else if(rect.top-gap-h>=pad)y=rect.top-gap-h;
 else if(rect.right+gap+w<=width-pad){x=rect.right+gap;y=clamp(rect.top,pad,height-h-pad);}
 else if(rect.left-gap-w>=pad){x=rect.left-gap-w;y=clamp(rect.top,pad,height-h-pad);}
 else y=height-h-pad;
 return {left:x,top:y};
}
function start(){
 const url=new URL(location.href),key=url.searchParams.get('guide'),config=GUIDES[key];
 if(!config||location.pathname.split('/').pop()!==config.page)return;
 // Consume only the tour parameter, preserving operator links and other page state.
 url.searchParams.delete('guide');history.replaceState(history.state,'',url);
 const steps=config.steps.filter(([selector])=>document.querySelector(selector));
 if(!steps.length)return;
 const previousFocus=document.activeElement,scroll={x:scrollX,y:scrollY};
 const dialog=document.createElement('dialog');dialog.className='zoot-tour';dialog.setAttribute('aria-labelledby','zootTourTitle');dialog.setAttribute('aria-describedby','zootTourDescription');
 dialog.innerHTML=`<svg class="zoot-tour-shade" aria-hidden="true"><defs><mask id="zootTourMask" maskUnits="userSpaceOnUse"><rect width="100%" height="100%" fill="white"/><rect id="zootTourHole" fill="black"/></mask></defs><rect width="100%" height="100%" fill="rgba(0,0,0,.76)" mask="url(#zootTourMask)"/><rect id="zootTourBorder" fill="none" stroke="var(--z-accent)" stroke-width="3"/></svg><section class="zoot-tour-panel"><div class="zoot-tour-heading"><span id="zootTourProgress" role="status" aria-live="polite"></span><button type="button" data-tour="close" aria-label="가이드 종료">종료 ×</button></div><h2 id="zootTourTitle"></h2><p id="zootTourDescription">상세 안내는 추후 추가됩니다.</p><p class="zoot-tour-hint">어두운 배경 클릭 · 왼쪽 이전 / 오른쪽 다음</p><div class="zoot-tour-actions"><button type="button" data-tour="previous">이전</button><button type="button" data-tour="next">다음</button></div></section>`;
 document.body.append(dialog);
 const panel=dialog.querySelector('.zoot-tour-panel'),hole=dialog.querySelector('#zootTourHole'),border=dialog.querySelector('#zootTourBorder'),previous=dialog.querySelector('[data-tour=previous]'),next=dialog.querySelector('[data-tour=next]');
 let index=0,target=null,frame=0,closed=false,observer=new ResizeObserver(schedule);
 function update(){
  frame=0;if(closed||!target)return;
  const r=target.getBoundingClientRect(),width=innerWidth,height=innerHeight;
  const left=Math.max(3,r.left-6),top=Math.max(3,r.top-6),right=Math.min(width-3,r.right+6),bottom=Math.min(height-3,r.bottom+6);
  for(const shape of [hole,border])for(const [attr,value] of Object.entries({x:left,y:top,width:Math.max(0,right-left),height:Math.max(0,bottom-top)}))shape.setAttribute(attr,String(value));
  const pos=panelPosition({left,top,right,bottom},panel.getBoundingClientRect(),width,height);
  panel.style.left=pos.left+'px';panel.style.top=pos.top+'px';
 }
 function schedule(){if(!frame&&!closed)frame=requestAnimationFrame(update);}
 function show(){
  observer.disconnect();target=document.querySelector(steps[index][0]);
  if(!target){finish();return;}
  dialog.querySelector('#zootTourTitle').textContent=steps[index][1];
  dialog.querySelector('#zootTourProgress').textContent=config.name+' · '+(index+1)+' / '+steps.length;
  previous.disabled=index===0;next.textContent=index===steps.length-1?'완료':'다음';
  target.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
  observer.observe(target);observer.observe(panel);update();
 }
 function finish(){
  if(closed)return;closed=true;observer.disconnect();cancelAnimationFrame(frame);
  window.removeEventListener('resize',schedule);window.removeEventListener('scroll',schedule,true);
  dialog.close();dialog.remove();window.scrollTo({left:scroll.x,top:scroll.y,behavior:'instant'});previousFocus?.focus({preventScroll:true});
 }
 dialog.querySelector('[data-tour=close]').addEventListener('click',finish);
 previous.addEventListener('click',()=>{if(index>0){index--;show();}});
 next.addEventListener('click',()=>{if(index===steps.length-1)finish();else{index++;show();}});
 dialog.addEventListener('cancel',event=>{event.preventDefault();finish();});
 // Navigate only on the dimmed background; the spotlight and card are excluded.
 function backgroundSide(event){
  if(event.button!==0||panel.contains(event.target))return null;
  const r=hole.getBoundingClientRect();
  if(event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom)return null;
  return event.clientX<innerWidth/2?'previous':'next';
 }
 let pressedSide=null;
 dialog.addEventListener('pointerdown',event=>{pressedSide=backgroundSide(event);});
 dialog.addEventListener('pointercancel',()=>{pressedSide=null;});
 dialog.addEventListener('click',event=>{
  const side=backgroundSide(event),pressed=pressedSide;pressedSide=null;
  if(!side||side!==pressed)return;
  if(side==='previous'){if(index>0){index--;show();}}
  else if(index===steps.length-1)finish();else{index++;show();}
 });
 window.addEventListener('resize',schedule);window.addEventListener('scroll',schedule,true);
 dialog.showModal();show();next.focus({preventScroll:true});
}
if(document.readyState==='complete')start();else window.addEventListener('load',start,{once:true});
