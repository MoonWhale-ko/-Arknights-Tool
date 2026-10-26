// Feature guides share the spotlight navigation and provide copy per step.
export const GUIDES={
 mining:{page:'rewards.html',name:'광산',steps:[['#rewardsImport','계정 가져오기','요스타 계정을 가져와 조회 결과를 적용하면 남은 일회성 보상이 자동으로 계산됩니다. 이미 가져온 계정 기록이 있으면 그 기록을 사용합니다.'],['.reward-totals','남은 재화','순오리지늄과 합성옥의 남은 일회성 보상을 확인합니다. 육성이나 선행 스테이지 진행이 필요한 보상도 포함합니다.'],['.reward-filters','보상 찾기','스테이지나 오퍼레이터 이름으로 검색하고, 광산 선택 버튼을 누르고 팝업의 체크박스로 표시할 광산을 고르세요. 숨긴 광산은 합계에서도 제외합니다. 목록에는 미수령 보상만 표시합니다.'],['#rewardsGroups','콘텐츠별 보상','콘텐츠 카드를 누르면 해당 줄 아래에 상세 보상 박스가 열립니다. 한 번에 하나만 열리며, 메인은 지역 번호, 사이드 스토리는 소속 분류를 제목 옆에 표시합니다.'],['.reward-stage-panel:not([hidden])','스테이지와 작전 구분','같은 번호의 기본·험지 작전은 하나로 묶습니다. 스테이지를 펼쳐 작전별 보상과 해금 조건을 확인하세요. 패러독스 시뮬레이션은 입장 가능한 오퍼레이터를 먼저, 각 그룹 안에서는 높은 등급부터 표시합니다.']]},
 recruitment:{page:'recruitment.html',name:'공개모집 계산기',steps:[["#tagSearch","태그 앞글자 검색","태그 이름의 첫 글자를 이어서 입력하면 해당 태그가 선택됩니다. 같은 글자로 시작하는 태그가 여러 개면 빨간 테두리로 표시된 후보 중 하나를 골라 주세요."],[".recruit-time","모집 시간","실제 게임에서 설정할 모집 시간을 선택하세요. 선택한 시간에 따라 등장 가능한 등급과 계산 결과가 달라집니다."],["#tagArea","태그 선택","게임에 표시된 태그를 최대 5개 선택하세요. 선택한 태그를 다시 누르면 해제되고, 태그 초기화를 누르면 모두 지워집니다."],["#settingsBtn","추가 설정","표시할 등급, 고등급 확정식만 보기, 오퍼레이터 이미지 방식을 설정할 수 있습니다. 변경한 설정은 적용을 눌러 저장하세요."],[".results-header","모집 결과","선택한 태그에서 가능한 조합과 오퍼레이터를 확인합니다. 오퍼레이터에 마우스를 올리면 해당 오퍼레이터가 가진 태그를 볼 수 있습니다."]]},
 operators:{page:'operators.html',name:'오퍼레이터',steps:[["#q","오퍼레이터 검색","오퍼레이터의 이름이나 별명을 입력해 찾으세요. 검색한 오퍼레이터 카드에서 보유 여부와 정예화·레벨·잠재·스킬·모듈 정보를 수정할 수 있습니다."],["#ownedFilter","보유 여부","전체·보유·미보유 중 표시할 대상을 고르세요. 계정에서 가져오거나 카드에서 직접 설정한 보유 여부를 기준으로 구분합니다."],["#rarityOptions","등급 선택","표시할 오퍼레이터의 등급을 켜고 끌 수 있습니다. 검색과 보유 여부, 직군 필터를 함께 사용해 목록을 좁혀 보세요."],[".profession-picker","직군 선택","기본 직군을 고르면 해당 직군의 오퍼레이터가 표시됩니다. 세부 직군을 선택하면 더 좁은 범위로 확인할 수 있습니다."],[".plan-link","육성 계획","현재 육성 정보와 별도로 목표를 설정하는 화면으로 이동합니다. 육성 계획에서 목표를 입력하고 추가로 필요한 재료를 확인해 보세요."],["#exportPng","PNG 출력","출력 대상과 카드 배치, 표시할 육성 정보를 설정한 뒤 PNG로 저장할 수 있습니다. 미리보기에서 구성을 확인하고 이미지 한 장으로 내보내세요."]]},
 plans:{page:'plans.html',name:'육성 계획',steps:[["#q","오퍼레이터 검색","목표를 설정할 오퍼레이터를 이름이나 별명으로 찾으세요. 카드에서 수정한 값은 현재 육성 정보와 별도로 계획에 저장되며, 달라진 항목은 노란색으로 표시됩니다."],["#ownedFilter","보유 여부","전체·보유·미보유 중 계획을 살펴볼 대상을 고르세요. 아직 보유하지 않은 오퍼레이터도 획득 후의 육성 목표를 설정할 수 있습니다."],["#futureOnly","미래시","미래시를 켜면 한국 서버에 아직 출시되지 않은 오퍼레이터만 표시합니다. 해당 오퍼레이터의 육성 정보는 중국 서버 데이터를 기준으로 합니다."],["#rarityOptions","등급 선택","계획을 확인할 오퍼레이터의 등급을 선택하세요. 여러 등급을 함께 표시하거나 필요 없는 등급을 숨길 수 있습니다."],["#growthOpen","필요 재료 확인","현재 육성 상태에서 설정한 목표까지 추가로 필요한 재료를 계산합니다. 합산할 오퍼레이터를 선택하고, 보유 수량과 비교해 부족한 재료를 확인하세요."]]},
 materials:{page:'materials.html',name:'육성 재료',steps:[["#search","오퍼레이터 선택","육성 재료를 확인할 오퍼레이터 이름을 입력하고 목록에서 선택하세요. 같은 이름의 다른 직군이 있으면 직군 표기를 함께 확인해 주세요."],["#content","육성 재료 조회","선택한 오퍼레이터의 정예화·스킬 레벨·마스터리·모듈 재료를 단계별로 확인합니다. 모듈은 해금 조건과 임무도 함께 살펴볼 수 있습니다."]]},
 backpack:{page:'backpack.html',name:'창고',steps:[["#categories","창고 분류","전체·소모 물품·기본 물품·육성 재료 중 원하는 분류를 선택하세요. 인게임 창고를 바탕으로 정리된 아이템을 확인할 수 있습니다."],["#search","재료 검색","아이템 이름을 입력해 원하는 재료를 찾으세요. 현재 선택한 분류와 보유·전체 설정 안에서 검색합니다."],["#subcategory","세부 분류","육성 재료·작전기록·정예화 칩 등 세부 분류로 목록을 좁힐 수 있습니다. 세부 분류 전체를 선택하면 이 필터를 해제합니다."],["#ownedOnly","보유·전체 전환","보유에서는 수량이 있는 아이템만 표시합니다. 전체로 바꾸면 수량이 0인 아이템도 확인하고 보유 수량을 입력할 수 있습니다."],["#itemViewport","보유 아이템","좌우로 스크롤해 아이템을 확인하고, 아이템을 누르면 보유 수량을 수정할 수 있습니다. 수정한 수량은 이 브라우저에 자동 저장됩니다."]]},
 base:{page:'base.html',name:'기반시설',steps:[["#baseViewport","기반시설 배치도","가져온 계정의 시설과 레벨을 확인하세요. 제조소를 누르면 생산 품목을, 무역소를 누르면 거래 방식을 설정할 수 있습니다."],[".optimizer-priority","생산 우선순위","배치 추천에서 우선할 생산물을 1~3순위로 정하세요. 제조소의 실제 생산 품목도 배치도에서 함께 확인해 주세요."],["#optimizerRotationTitle","교대 조건","2교대·3교대와 교대 시점을 선택하세요. 첫 소진은 한 명이라도 컨디션이 0일 때, 전원 소진은 근무조 모두가 0일 때 교대합니다. 12시간마다 교대하도록 설정할 수도 있습니다."],[".optimizer-compute-settings","비교 생산량과 계산 시간","첫 24시간과 첫 사이클 중 어떤 생산량을 기준으로 배치를 비교할지 정하세요. 첫 사이클은 모든 근무조가 한 번씩 근무를 마칠 때까지이며, 계산 시간을 늘리면 더 많은 후보를 비교합니다."],["#optimizerAdvanced","숙소 인테리어 설정","세부 설정에서 각 숙소의 인테리어 점수를 확인하세요. 계정에서 가져온 값이 없으면 직접 입력해야 하며, 이 점수는 컨디션 회복 계산에 사용됩니다."],["#optimizerRun","현재 육성 기준 계산","보유 오퍼레이터의 현재 정예화·레벨에서 해금된 인프라 스킬로 배치를 계산합니다. 결과에서 시설별 근무조와 교대 시점, 숙소 고정 지원자를 확인하세요."],["#optimizerTrainingRun","인프라 스킬 해금 완료 시 계산","보유 오퍼레이터의 모든 인프라 스킬이 해금·강화된 조건으로 배치를 계산합니다. 추천 배치에 필요한 육성 대상과 최종 해금 조건을 보여주며, 실제 육성 정보는 바꾸지 않습니다."]]}
};
// Only reversible display controls are used for practice steps.
GUIDES.recruitment.steps[2][3]={event:'click',match:'button[data-tag]',attribute:'aria-pressed',prompt:'강조된 영역에서 태그를 하나 직접 눌러 보세요. 선택한 태그에 맞춰 모집 결과가 바뀝니다.',resultTarget:'.results-header',resultTitle:'태그 선택 결과',resultText:'태그 선택이 반영되었습니다. 이 영역에서 선택한 태그로 가능한 조합과 오퍼레이터를 확인할 수 있습니다. 태그를 다시 누르면 선택이 해제됩니다.'};
GUIDES.operators.steps.splice(3,0,['#futureOnly','미래시 직접 보기','',{event:'click',match:'#futureOnly',attribute:'aria-pressed',prompt:'미래시 버튼을 직접 눌러 보세요. 한국 서버에 아직 출시되지 않은 오퍼레이터만 모아 볼 수 있습니다.',resultTitle:'미래시 표시 결과',resultText:'미래시 버튼이 켜지면 미출시 오퍼레이터만 표시됩니다. 다시 누르면 이 필터가 해제됩니다.'}]);
GUIDES.plans.steps[2][3]={event:'click',match:'#futureOnly',attribute:'aria-pressed',prompt:'미래시 버튼을 직접 눌러 보세요. 미출시 오퍼레이터의 육성 계획을 따로 살펴볼 수 있습니다.',resultTitle:'미래시 계획 확인',resultText:'미래시 필터가 전환되었습니다. 켜져 있을 때는 한국 서버 미출시 오퍼레이터가 표시되며, 육성 재료는 중국 서버 데이터를 기준으로 확인합니다.'};
GUIDES.backpack.steps[3][3]={event:'click',match:'#ownedOnly',attribute:'aria-checked',prompt:'보유·전체 전환 버튼을 직접 눌러 보세요. 수량이 없는 아이템까지 표시할지 바꿀 수 있습니다.',resultTarget:'#itemViewport',resultTitle:'창고 표시 결과',resultText:'보유에서는 수량이 있는 아이템만, 전체에서는 수량이 0인 아이템까지 표시합니다. 이 설정은 표시 범위만 바꾸며 실제 보유 수량은 바뀌지 않습니다.'};
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
export function shadeRects(rect,width,height){
 const clamp=(n,max)=>Math.max(0,Math.min(n,max));
 const left=clamp(rect.left,width),top=clamp(rect.top,height),right=Math.max(left,clamp(rect.right,width)),bottom=Math.max(top,clamp(rect.bottom,height));
 return [{left:0,top:0,width,height:top},{left:0,top,width:left,height:bottom-top},{left:right,top,width:width-right,height:bottom-top},{left:0,top:bottom,width,height:height-bottom}];
}
export function interactionChanged(before,after){return before!==null&&after!==null&&before!==after;}
let miningReadyWait=0;
function start(){
 const url=new URL(location.href),key=url.searchParams.get('guide'),config=GUIDES[key];
 const currentPage=location.pathname.split('/').pop();
 if(!config||![config.page,config.page.replace(/\.html$/,'')].includes(currentPage))return;
 if(key==='mining'&&document.getElementById('rewardsResults')?.hidden&&miningReadyWait++<15){setTimeout(start,100);return;}
 url.searchParams.delete('guide');history.replaceState(history.state,'',url);
 const steps=config.steps.filter(([selector])=>{const target=document.querySelector(selector);return target&&(key!=='mining'||target.getClientRects().length>0);});
 if(!steps.length)return;
 const previousFocus=document.activeElement,scroll={x:scrollX,y:scrollY},completed=new Set();
 // A regular overlay leaves the highlighted real control interactive. Four shields
 // cover the rest of the screen; the SVG itself never intercepts control clicks.
 const overlay=document.createElement('div');overlay.className='zoot-tour';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','false');overlay.setAttribute('aria-labelledby','zootTourTitle');overlay.setAttribute('aria-describedby','zootTourDescription');
 overlay.innerHTML=`<svg class="zoot-tour-shade" aria-hidden="true"><defs><mask id="zootTourMask" maskUnits="userSpaceOnUse"><rect width="100%" height="100%" fill="white"/><rect id="zootTourHole" fill="black"/></mask></defs><rect width="100%" height="100%" fill="rgba(0,0,0,.76)" mask="url(#zootTourMask)"/><rect id="zootTourBorder" fill="none" stroke="var(--z-accent)" stroke-width="3"/></svg>${'<div class="zoot-tour-shield" aria-hidden="true"></div>'.repeat(4)}<div class="zoot-tour-hole-shield" aria-hidden="true"></div><section class="zoot-tour-panel"><div class="zoot-tour-heading"><span id="zootTourProgress" role="status" aria-live="polite"></span><button type="button" data-tour="close" aria-label="가이드 종료">종료 ×</button></div><span id="zootTourPractice" class="zoot-tour-practice" hidden></span><h2 id="zootTourTitle"></h2><p id="zootTourDescription" aria-live="polite"></p><div class="zoot-tour-actions"><button type="button" data-tour="previous">이전</button><button type="button" data-tour="next">다음</button></div></section>`;
 document.body.append(overlay);
 const $=selector=>overlay.querySelector(selector),panel=$('.zoot-tour-panel'),hole=$('#zootTourHole'),border=$('#zootTourBorder'),previous=$('[data-tour=previous]'),next=$('[data-tour=next]'),holeShield=$('.zoot-tour-hole-shield'),shields=[...overlay.querySelectorAll('.zoot-tour-shield')],practice=$('#zootTourPractice');
 let index=0,target=null,frame=0,closed=false,stepVersion=0,detachAction=()=>{},observer=new ResizeObserver(schedule);
 const pending=()=>Boolean(steps[index][3])&&!completed.has(index);
 function box(element,rect){Object.assign(element.style,{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'});}
 function update(){
  frame=0;if(closed||!target)return;
  const r=target.getBoundingClientRect(),width=document.documentElement.clientWidth,height=innerHeight;
  const left=Math.max(0,Math.min(width,r.left-6)),top=Math.max(0,Math.min(height,r.top-6)),right=Math.max(left,Math.min(width,r.right+6)),bottom=Math.max(top,Math.min(height,r.bottom+6));
  for(const shape of [hole,border])for(const [attr,value] of Object.entries({x:left,y:top,width:right-left,height:bottom-top}))shape.setAttribute(attr,String(value));
  shadeRects({left,top,right,bottom},width,height).forEach((rect,i)=>box(shields[i],rect));
  box(holeShield,{left,top,width:right-left,height:bottom-top});holeShield.hidden=pending();
  const pos=panelPosition({left,top,right,bottom},panel.getBoundingClientRect(),width,height);
  panel.style.left=pos.left+'px';panel.style.top=pos.top+'px';
 }
 function schedule(){if(!frame&&!closed)frame=requestAnimationFrame(update);}
 function show(){
  stepVersion++;detachAction();observer.disconnect();
  const step=steps[index],action=step[3],done=completed.has(index),waiting=pending();
  target=document.querySelector(done&&action?.resultTarget? action.resultTarget:step[0]);
  if(!target){finish();return;}
  $('#zootTourTitle').textContent=done&&action?.resultTitle?action.resultTitle:step[1];
  $('#zootTourDescription').textContent=action?(done?action.resultText:action.prompt):step[2];
  $('#zootTourProgress').textContent=config.name+' · '+(index+1)+' / '+steps.length;
  practice.hidden=!action;practice.textContent=done?'확인 완료':'직접 해보기';
  previous.disabled=index===0;next.disabled=waiting;next.textContent=waiting?'직접 눌러 주세요':index===steps.length-1?'완료':'다음';
  target.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
  observer.observe(target);observer.observe(panel);update();
  if(waiting){
   const version=stepVersion;
   const listener=event=>{
    const control=event.target.closest?.(action.match);if(!control||!target.contains(control)||control.disabled)return;
    const before=control.getAttribute(action.attribute);
    // Run after the page's own handler, so unsuccessful actions do not advance.
    setTimeout(()=>{if(closed||version!==stepVersion||!interactionChanged(before,control.getAttribute(action.attribute)))return;completed.add(index);show();next.focus({preventScroll:true});},0);
   };
   document.addEventListener(action.event,listener,true);detachAction=()=>document.removeEventListener(action.event,listener,true);
   const control=target.matches(action.match)?target:target.querySelector(action.match);control?.focus({preventScroll:true});
  }else next.focus({preventScroll:true});
 }
 function finish(){
  if(closed)return;closed=true;stepVersion++;detachAction();observer.disconnect();cancelAnimationFrame(frame);
  window.removeEventListener('resize',schedule);window.removeEventListener('scroll',schedule,true);document.removeEventListener('keydown',keyHandler,true);
  overlay.remove();window.scrollTo({left:scroll.x,top:scroll.y,behavior:'instant'});previousFocus?.focus({preventScroll:true});
 }
 function goNext(){if(pending())return;if(index===steps.length-1)finish();else{index++;show();}}
 function goPrevious(){if(index>0){index--;show();}}
 $('[data-tour=close]').addEventListener('click',finish);previous.addEventListener('click',goPrevious);next.addEventListener('click',goNext);
 let pressedSide=null;
 const side=event=>event.button===0?(event.clientX<document.documentElement.clientWidth/2?'previous':'next'):null;
 for(const shield of shields){
  shield.addEventListener('pointerdown',event=>{pressedSide=side(event);});
  shield.addEventListener('pointercancel',()=>{pressedSide=null;});
  shield.addEventListener('click',event=>{const current=side(event),pressed=pressedSide;pressedSide=null;if(!current||pressed!==current)return;if(current==='previous')goPrevious();else goNext();});
 }
 function keyHandler(event){
  if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();finish();return;}
  if(event.key!=='Tab')return;
  const candidates=[...panel.querySelectorAll('button:not(:disabled)')];
  if(pending()){
   const match=steps[index][3].match;
   const controls=target.matches(match)?[target]:[...target.querySelectorAll(match)];
   candidates.unshift(...controls.filter(el=>!el.disabled&&el.getBoundingClientRect().width>0));
  }
  if(!candidates.length)return;
  event.preventDefault();const position=candidates.indexOf(document.activeElement),offset=event.shiftKey?-1:1;
  const destination=position<0?(event.shiftKey?candidates.length-1:0):(position+offset+candidates.length)%candidates.length;
  candidates[destination].focus({preventScroll:true});
 }
 document.addEventListener('keydown',keyHandler,true);window.addEventListener('resize',schedule);window.addEventListener('scroll',schedule,true);show();
}
if(typeof document!=='undefined'){
 if(document.readyState==='complete')start();else window.addEventListener('load',start,{once:true});
}
