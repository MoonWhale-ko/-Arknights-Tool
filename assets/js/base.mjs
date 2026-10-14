import {BASE_KEY,BASE_SLOTS,FACILITIES,capacity,readBase} from './base-state.mjs?v=2';
let characterNames={};
fetch('data/account-characters.json').then(r=>r.ok?r.json():null).then(data=>{characterNames=data?.characters??{};render();}).catch(()=>{});
const status=document.getElementById('baseStatus');let settings;
function load(){try{settings=readBase(JSON.parse(localStorage.getItem(BASE_KEY)||'null'));}catch{settings=readBase(null);}}
function statusText(){if(settings.importedAt){const time=new Date(settings.importedAt).toLocaleString('ko-KR');status.textContent=`계정 조회: ${time}${settings.source==='manual'?' · 이후 직접 수정됨':''}`;}else status.textContent='게임 계정 가져오기에서 조회 결과를 적용하면 시설 정보가 자동 반영됩니다.';}
function save(){settings.source='manual';settings.modifiedAt=new Date().toISOString();try{localStorage.setItem(BASE_KEY,JSON.stringify(settings));status.textContent='시설 레벨과 인원수를 저장했습니다.';}catch{status.textContent='이 브라우저에서는 저장할 수 없습니다. 현재 화면에서만 적용됩니다.';}}
const facilityArt={
 TRADING:'<path d="M20 29h56v39H20zM31 29v-9h34v9M30 44h34M30 54h20m11-8 10 9-10 9"/>',
 MANUFACTURE:'<path d="m21 65 17-9V37l-17 9Zm17-28 17 9 17-9-17-9ZM55 46v19l17-9V37M21 27l17 9 17-9-17-9ZM21 27v19m17-10v20"/>',
 POWER:'<path d="m52 17-23 34h19l-5 26 26-38H50Z"/>',
 CONTROL:'<path d="m48 12 32 18v36L48 84 16 66V30ZM16 30l32 18 32-18M48 48v36M32 21l32 18"/>',
 DORMITORY:'<path d="M23 31h15v40H23zM42 25h16v46H42zM62 36h12v35H62z"/>',
 MEETING:'<path d="M25 23h46v53H25zM34 34h28M34 46h28M34 58h19"/>',
 WORKSHOP:'<path d="m25 39 13-7 13 7v15l-13 7-13-7ZM47 22l13-7 13 7v15l-13 7-13-7ZM47 57l13-7 13 7v15l-13 7-13-7Z"/>',
 HIRE:'<path d="M22 32h52v42H22zM37 32V20h22v12M31 43h5m9 0h5m9 0h5M31 55h5m9 0h5m9 0h5M31 66h5m9 0h5m9 0h5"/>',
 TRAINING:'<path d="m28 17 47 47-11 11-47-47Zm-4 40 15 15m-7-7-16 16m41-57 15 15m-7-7 16-16"/>',
 PRIVATE:'<path d="M25 21h46v54H25zM37 36h22M42 48v16m-7-8h14"/>'
};
function decorateRoom(card,type){
 const art=document.createElement('span');art.className='facility-art';art.setAttribute('aria-hidden','true');
 art.innerHTML=`<svg viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"><path class="facility-hex" d="m48 4 38 22v44L48 92 10 70V26Z"/>${facilityArt[type]||''}</svg>`;
 card.prepend(art);
 const trim=document.createElement('span');trim.className='facility-trim';trim.setAttribute('aria-hidden','true');trim.innerHTML='<span class="facility-rail"></span><span class="facility-floor"><span></span><span></span><span></span><span></span><span></span></span>';card.prepend(trim);
}
function showOccupancy(element,count,max){
 element.replaceChildren();const current=document.createElement('span');current.className='occupancy-current';current.textContent=String(count);const limit=document.createElement('span');limit.className='occupancy-limit';limit.textContent=`/${max}`;element.append(current,limit);
}
function room(slotId,type,name,saved){
 const card=document.createElement('article');card.className=`room room-${FACILITIES[type].css}`;card.setAttribute('aria-label',name);let level=saved?.level??0,count=saved?.count??0;
 card.innerHTML=`<div class="room-heading"><h2>${name}</h2><span class="level-bars" aria-hidden="true"></span><span class="level-text"></span></div><div class="room-occupancy"></div><div class="room-controls"><label class="level-control">Lv. <select aria-label="${name} 설비 레벨"></select></label><label class="count-control">인원 <select aria-label="${name} 배치 인원"></select><span class="capacity"></span></label></div>`;
 if(['TRADING','MANUFACTURE','POWER','DORMITORY','MEETING','WORKSHOP','HIRE','TRAINING'].includes(type))card.querySelector('h2').textContent=FACILITIES[type].name;
 if(type==='CONTROL'){
  const subtitle=document.createElement('span');subtitle.className='control-subtitle';subtitle.textContent='LEVEL OF CONTROL INTERFACE';card.querySelector('.room-heading').append(subtitle);
  const ornament=document.createElement('span');ornament.className='control-level-ornament';ornament.setAttribute('aria-hidden','true');ornament.innerHTML='<svg viewBox="0 0 150 92" fill="none"><path d="M12 6 3 16V72L15 85M138 6l9 10V72l-12 13" stroke="#f0f1ed" stroke-width="1.5"/></svg>';card.append(ornament);
 }
 const levelInput=card.querySelector('.level-control select'),countInput=card.querySelector('.count-control select'),limit=card.querySelector('.capacity');
 for(let i=0;i<=FACILITIES[type].capacity.length;i++){const o=document.createElement('option');o.value=i;o.textContent=i===0?'미건설':i;levelInput.append(o);}levelInput.value=String(level);
 function renderCount(){const max=capacity(type,level);count=Math.min(count,max);countInput.replaceChildren();for(let i=0;i<=max;i++){const o=document.createElement('option');o.value=i;o.textContent=i;countInput.append(o);}countInput.value=String(count);limit.textContent=` / ${max}`;
 const bars=card.querySelector('.level-bars');bars.replaceChildren();for(let i=0;i<FACILITIES[type].capacity.length;i++){const bar=document.createElement('span');bar.className=i<level?'active':'';bars.append(bar);}
 card.querySelector('.level-text').textContent=type==='CONTROL'?`${level}.0`:level===0?'미건설':`Lv.${level}`;
 showOccupancy(card.querySelector('.room-occupancy'),count,max);
 card.setAttribute('aria-label',`${name} · 설비 레벨 ${level} · 인원 ${count} / ${max}`);
 }
 function update(){settings.rooms[slotId]={type,level,count,operators:[]};save();}
 levelInput.addEventListener('change',()=>{level=Number(levelInput.value);renderCount();update();});countInput.addEventListener('change',()=>{count=Number(countInput.value);renderCount();update();});renderCount();decorateRoom(card,type);return card;
}
function privateRoom(slotId,name,saved){
 const card=document.createElement('article');card.className='room room-private';const level=saved?.level??0,count=saved?.count??0;
 const heading=document.createElement('div');heading.className='room-heading';const title=document.createElement('h2');title.textContent=FACILITIES.PRIVATE.name;heading.append(title);
 const bars=document.createElement('span');bars.className='level-bars';bars.setAttribute('aria-hidden','true');for(let i=0;i<3;i++){const bar=document.createElement('span');bar.className=i<level?'active':'';bars.append(bar);}heading.append(bars);card.append(heading);
 const content=document.createElement('div');content.className='private-occupant';const id=saved?.operators?.[0];
 if(id){
  const image=document.createElement('img');image.src=`https://raw.githubusercontent.com/ArknightsAssets/ArknightsAssets2/cn/assets/dyn/arts/charavatars/${id}.png`;image.alt='';image.loading='lazy';image.addEventListener('error',()=>{if(!image.src.endsWith('/assets/icons/activity-empty.svg'))image.src='assets/icons/activity-empty.svg';});
  const details=document.createElement('div');const opName=document.createElement('strong');opName.textContent=characterNames[id]?.name??id;opName.title=opName.textContent;
  const trust=document.createElement('span');trust.className='private-trust';trust.textContent=Number.isInteger(saved.trust?.[id])?`신뢰도 ${saved.trust[id]}%`:'신뢰도 정보 없음';heading.append(trust);details.append(opName);content.append(image,details);
 }else{const empty=document.createElement('span');empty.className='private-empty';empty.textContent=!settings.privateRoomsIncluded?'계정 재조회 필요':!level?'미건설':saved?.occupantsKnown===false?'다시 조회해 주세요':count?'캐릭터 정보 없음':'비어 있음';content.append(empty);const placeholder=document.createElement('img');placeholder.src='assets/icons/activity-empty.svg';placeholder.alt='비어 있는 활동실';placeholder.className='private-placeholder';content.append(placeholder);}
 card.append(content);const occupancy=document.createElement('span');occupancy.className='room-occupancy';if(saved?.occupantsKnown===false&&level&&settings.privateRoomsIncluded)occupancy.textContent='인원 정보 없음';else showOccupancy(occupancy,settings.privateRoomsIncluded?count:'—',settings.privateRoomsIncluded?(level?1:0):1);card.append(occupancy);
 card.setAttribute('aria-label',`${name} · 레벨 ${level} · ${content.textContent}`);decorateRoom(card,'PRIVATE');return card;
}
function render(){const counters={};const groups={production:document.getElementById('productionRooms'),living:document.getElementById('livingRooms'),support:document.getElementById('supportRooms'),private:document.getElementById('privateRooms')};Object.values(groups).forEach(el=>el.replaceChildren());
 for(const [slotId,group,fallback] of BASE_SLOTS){const saved=settings.rooms[slotId],type=saved?.type??fallback;counters[type]=(counters[type]??0)+1;const name=FACILITIES[type].name+(['TRADING','MANUFACTURE','POWER','DORMITORY','PRIVATE'].includes(type)?` ${counters[type]}`:'');groups[group].append(type==='PRIVATE'?privateRoom(slotId,name,saved):room(slotId,type,name,saved));}statusText();updateElevatorLinks();requestAnimationFrame(updateControlHatching);}
load();render();window.addEventListener('storage',e=>{if(e.key===BASE_KEY||e.key===null){load();render();}});window.addEventListener('pageshow',()=>{load();render();});

const editButton=document.getElementById('editFacilities');editButton.addEventListener('click',()=>{const editing=editButton.getAttribute('aria-pressed')!=='true';editButton.setAttribute('aria-pressed',String(editing));editButton.textContent=editing?'설비 설정 완료':'설비 설정';document.getElementById('baseMap').classList.toggle('editing',editing);});

const viewport=document.getElementById('baseViewport');
function pan(direction){viewport.scrollBy({left:direction*viewport.clientWidth*.65,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
viewport.addEventListener('keydown',event=>{if(event.target!==viewport)return;if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();pan(event.key==='ArrowLeft'?-1:1);}});
let panDrag=null;
viewport.addEventListener('pointerdown',event=>{if(event.pointerType!=='mouse'||event.button!==0||event.target.closest('button,a,input,select,label')||viewport.scrollWidth<=viewport.clientWidth)return;panDrag={id:event.pointerId,x:event.clientX,left:viewport.scrollLeft};viewport.setPointerCapture(event.pointerId);viewport.classList.add('dragging');event.preventDefault();});
viewport.addEventListener('pointermove',event=>{if(panDrag?.id!==event.pointerId)return;viewport.scrollLeft=panDrag.left+panDrag.x-event.clientX;});
function endPan(event){if(panDrag?.id!==event.pointerId)return;panDrag=null;viewport.classList.remove('dragging');}
viewport.addEventListener('pointerup',endPan);viewport.addEventListener('pointercancel',endPan);viewport.addEventListener('lostpointercapture',endPan);


// Decorative circulation layer follows the same room-height unit as the map.
const circulation=document.createElement('div');circulation.className='base-circulation';circulation.setAttribute('aria-hidden','true');
for(const position of ['left','middle','right']){
 const shaft=document.createElement('div');shaft.className=`elevator elevator-${position}`;
 for(let floor=position==='right'?1:0;floor<(position==='right'?5:6);floor++){const landing=document.createElement('span');landing.className='elevator-landing';landing.dataset.floor=String(floor);shaft.append(landing);}
 circulation.append(shaft);
}
for(const [side,floors] of [['production',[3]],['living',[2,3,4,5]],['support',[2,3,4]],['activity',[2,3,4]]]){
 for(const floor of floors){const passage=document.createElement('span');passage.className=`passage passage-${side} passage-${side}-${floor}`;passage.style.setProperty('--floor',floor);passage.innerHTML='<svg class="passage-art" viewBox="0 0 108 60" aria-hidden="true"><path fill="#0b0c0c" d="M4 0H36L43 7H65L72 0H104Q108 0 108 4V56Q108 60 104 60H72L65 53H43L36 60H4Q0 60 0 56V4Q0 0 4 0Z"/><g fill="#579692"><path d="m12 31 8-4v8Zm9 0 8-4v8Zm56-4 8 4-8 4Zm10 0 8 4-8 4Z"/><circle cx="48" cy="17" r="4"/><path d="m47 23 10 2 7 10h6v5h-9l-7-10-3 6 10 7v6H43v-5h10l-7-5-8 10h-6l12-16 2-6-7 3-3 7-4-2 4-9 10-4Z"/></g></svg>';circulation.append(passage);}
}
document.getElementById('baseMap').prepend(circulation);

function updateElevatorLinks(){
 const regions=[...document.querySelectorAll('.room,.passage,.elevator-landing')].map(el=>({el,rect:el.getBoundingClientRect()}));
 for(const {el,rect:a} of regions){
  if(!el.classList.contains('elevator-landing'))continue;
  const connections=new Set();
  for(const {el:other,rect:b} of regions){
   if(other===el)continue;
   const overlapX=Math.min(a.right,b.right)-Math.max(a.left,b.left),overlapY=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
   if(overlapX>.5&&Math.abs(a.top-b.bottom)<.5)connections.add('up');
   if(overlapX>.5&&Math.abs(a.bottom-b.top)<.5)connections.add('down');
   if(overlapY>.5&&Math.abs(a.left-b.right)<.5)connections.add('left');
   if(overlapY>.5&&Math.abs(a.right-b.left)<.5)connections.add('right');
  }
  const crossGap=3.2+.5/(el.clientWidth/40);
  const strokes={
   up:`<path d="M20 ${40-crossGap}V15"/><path class="link-cap" d="M18.5 13.7h3"/>`,
   down:`<path d="M20 ${40+crossGap}V65"/><path class="link-cap" d="M18.5 66.3h3"/>`,
   left:`<path d="M${20-crossGap} 40H7"/><path class="link-cap" d="M5.7 38.5v3"/>`,
   right:`<path d="M${20+crossGap} 40H33"/><path class="link-cap" d="M34.3 38.5v3"/>`
  };
  el.dataset.connections=[...connections].join(' ');
  el.innerHTML=`<svg class="elevator-links" viewBox="0 0 40 80" aria-hidden="true"><g class="elevator-strokes">${[...connections].map(direction=>strokes[direction]).join('')}</g><path class="elevator-cross" d="m17 37 6 6m0-6-6 6"/></svg>`;
 }
 updateRegionCorners();
}
updateElevatorLinks();new ResizeObserver(updateElevatorLinks).observe(document.getElementById('baseMap'));

function updateRegionCorners(){
 for(const el of document.querySelectorAll('.room,.passage,.elevator-landing')){
  el.querySelector(':scope > .region-corners')?.remove();
  const w=el.offsetWidth,h=el.offsetHeight,inset=2.75,length=6,right=w-inset,bottom=h-inset;
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('region-corners');svg.setAttribute('aria-hidden','true');svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.setAttribute('preserveAspectRatio','none');
  svg.innerHTML=`<rect class="region-boundary" x=".75" y=".75" width="${w-1.5}" height="${h-1.5}"/><path d="M${inset+length} ${inset}H${inset}V${inset+length}M${right-length} ${inset}H${right}V${inset+length}M${inset} ${bottom-length}V${bottom}H${inset+length}M${right} ${bottom-length}V${bottom}H${right-length}"/>`;el.append(svg);
 }
}

// A separate background layer travels at 90% of the map speed.
const baseStage=document.getElementById('baseStage');
function updateGridParallax(){
 const stageBounds=baseStage.getBoundingClientRect();
 const stageScale=stageBounds.width/baseStage.offsetWidth;
 baseStage.style.setProperty('--stage-edge',`${stageBounds.left/stageScale}px`);
 const rail=document.querySelector('.production-grid .room-trading .facility-rail');
 if(rail){
  const stageRect=baseStage.getBoundingClientRect(),railRect=rail.getBoundingClientRect();
  const scale=stageRect.width/baseStage.offsetWidth;
  // The outlined INFRA07 A is centered at x=30.2 in the ornament tile.
  const railCenterAtStart=((railRect.left+railRect.right)/2-stageRect.left)/scale+viewport.scrollLeft;
  baseStage.style.setProperty('--label-x',`${railCenterAtStart-30.2}px`);
  // Keep the paired lines crossing the upper trading ornament fixed as cells shrink.
  const anchorColumn=Math.round((railCenterAtStart+10)/70);
  const tradingTop=(rail.closest('.room').getBoundingClientRect().top-stageRect.top)/scale;
  const anchorRow=Math.round((tradingTop-23)/70);
  baseStage.style.setProperty('--grid-origin-x',`${-10+anchorColumn*1.5}px`);
  baseStage.style.setProperty('--grid-origin-y',`${23+anchorRow*1.5}px`);
  const powerRail=document.querySelector('.production-grid .room-power .facility-rail');
  if(powerRail){
   const powerRect=powerRail.getBoundingClientRect();
   const powerRightAtStart=(powerRect.right-stageRect.left)/scale+viewport.scrollLeft;
   // Two repeats separate the trading and power ornaments; A's base is 4px right of its center.
   const repeatX=(powerRightAtStart-railCenterAtStart-4)/2;
   if(repeatX>60)baseStage.style.setProperty('--label-repeat-x',`${repeatX}px`);
  }

 }

 // The cross background gains another 35% over the grid's 90% travel.
 baseStage.style.setProperty('--cross-offset-x',`${-viewport.scrollLeft*.35}px`);
 baseStage.style.setProperty('--grid-x',`${-viewport.scrollLeft*.90}px`);
 baseStage.style.setProperty('--grid-extra',`${Math.max(0,viewport.scrollWidth-viewport.clientWidth)*.90}px`);
}
viewport.addEventListener('scroll',updateGridParallax,{passive:true});
viewport.addEventListener('pointermove',updateGridParallax,{passive:true});
new ResizeObserver(updateGridParallax).observe(viewport);
updateGridParallax();

// Start each page visit with the control center in the middle of the viewport.
function centerControlRoom(){
 const control=document.querySelector('.room-control');if(!control)return;
 const frame=viewport.getBoundingClientRect(),room=control.getBoundingClientRect();
 const scale=frame.width/viewport.offsetWidth;
 viewport.scrollLeft+=((room.left+room.right-frame.left-frame.right)/2)/scale;
 updateGridParallax();
}
requestAnimationFrame(centerControlRoom);
window.addEventListener('pageshow',()=>requestAnimationFrame(centerControlRoom));

function updateControlHatching(){
 const number=document.querySelector('.room-control .level-text');if(!number)return;
 const room=number.closest('.room-control'),textStyle=getComputedStyle(number);
 const unit=parseFloat(getComputedStyle(document.getElementById('baseMap')).getPropertyValue('--unit'));
 const size=parseFloat(textStyle.fontSize),lineHeight=parseFloat(textStyle.lineHeight);
 const context=document.createElement('canvas').getContext('2d');
 context.font=textStyle.fontWeight+' '+size+'px '+textStyle.fontFamily;
 context.letterSpacing=textStyle.letterSpacing==='normal'?'0px':textStyle.letterSpacing;
 const metrics=context.measureText(number.textContent),five=context.measureText('5');
 const ascent=metrics.fontBoundingBoxAscent??size*.915039;
 const descent=metrics.fontBoundingBoxDescent??size*.199707;
 const baseline=(lineHeight-ascent-descent)/2+ascent;
 // Bracket path reaches y=85 in a 92-high SVG; include half its stroke.
 const bracketBottom=room.clientHeight*.31+unit*.8575;
 number.style.top=(bracketBottom-baseline-(metrics.actualBoundingBoxDescent??0)-2)+'px';
 number.style.setProperty('--control-hatch-top',(baseline-five.actualBoundingBoxAscent)+'px');
 const style=getComputedStyle(number,'::before'),w=parseFloat(style.width),h=parseFloat(style.height);
 if(!(w>0&&h>0))return;
 const step=(w+h)/10;
 const paths=Array.from({length:10},(_,i)=>{
  const x=-h+(i+.5)*step;return 'M'+x.toFixed(4)+' 0l'+h.toFixed(4)+' '+h.toFixed(4);
 }).join(' ');
 const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><path d="'+paths+'" fill="none" stroke="#f5f6f4" stroke-width="1.5"/></svg>';
 number.style.setProperty('--control-hatch-image','url("data:image/svg+xml,'+encodeURIComponent(svg)+'")');
 const subtitle=room.querySelector('.control-subtitle');
 if(subtitle){
  const numberLeft=number.offsetLeft-number.offsetWidth/2;
  const left=numberLeft+parseFloat(style.left);
  const right=numberLeft+metrics.actualBoundingBoxRight;
  const width=right-left;
  const subtitleStyle=getComputedStyle(subtitle);
  context.font=subtitleStyle.fontWeight+' '+subtitleStyle.fontSize+' '+subtitleStyle.fontFamily;
  context.letterSpacing='0px';
  const subtitleMetrics=context.measureText(subtitle.textContent);
  const subtitleHeight=parseFloat(subtitleStyle.fontSize)*0.728;
  subtitle.style.left=left+'px';subtitle.style.width=width+'px';
  subtitle.style.height=subtitleHeight+'px';subtitle.style.letterSpacing='0px';
  subtitle.style.transform='none';
  subtitle.style.top=(parseFloat(number.style.top)+parseFloat(style.top)-3-subtitleHeight)+'px';
  const title=room.querySelector('.room-heading>h2');
  if(title){
   const titleStyle=getComputedStyle(title),titleSize=parseFloat(titleStyle.fontSize);
   context.font=titleStyle.fontWeight+' '+titleSize+'px '+titleStyle.fontFamily;
   context.letterSpacing='0px';
   const titleMetrics=context.measureText(title.textContent);
   const titleLeft=left+width*.068993057689;
   const titleRight=left+width*.853781409351;
   const titleScale=(titleRight-titleLeft)/(titleMetrics.actualBoundingBoxLeft+titleMetrics.actualBoundingBoxRight);
   const titleAscent=titleMetrics.fontBoundingBoxAscent??titleSize;
   const titleDescent=titleMetrics.fontBoundingBoxDescent??0;
   const titleBaseline=(parseFloat(titleStyle.lineHeight)-titleAscent-titleDescent)/2+titleAscent;
   title.style.left=(titleLeft+titleMetrics.actualBoundingBoxLeft*titleScale)+'px';
   title.style.top=(parseFloat(subtitle.style.top)-3-titleBaseline-titleMetrics.actualBoundingBoxDescent)+'px';
   title.style.width=titleMetrics.width+'px';title.style.letterSpacing='0px';
   title.style.transformOrigin='left top';title.style.transform='scaleX('+titleScale+')';
  }
 }

}
new ResizeObserver(updateControlHatching).observe(document.getElementById('baseMap'));
document.fonts.ready.then(updateControlHatching);
requestAnimationFrame(updateControlHatching);
