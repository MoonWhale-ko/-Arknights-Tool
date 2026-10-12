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
 const levelInput=card.querySelector('.level-control select'),countInput=card.querySelector('.count-control select'),limit=card.querySelector('.capacity');
 for(let i=0;i<=FACILITIES[type].capacity.length;i++){const o=document.createElement('option');o.value=i;o.textContent=i===0?'미건설':i;levelInput.append(o);}levelInput.value=String(level);
 function renderCount(){const max=capacity(type,level);count=Math.min(count,max);countInput.replaceChildren();for(let i=0;i<=max;i++){const o=document.createElement('option');o.value=i;o.textContent=i;countInput.append(o);}countInput.value=String(count);limit.textContent=` / ${max}`;
 const bars=card.querySelector('.level-bars');bars.replaceChildren();for(let i=0;i<FACILITIES[type].capacity.length;i++){const bar=document.createElement('span');bar.className=i<level?'active':'';bars.append(bar);}
 card.querySelector('.level-text').textContent=level===0?'미건설':`Lv.${level}`;
 showOccupancy(card.querySelector('.room-occupancy'),count,max);
 card.setAttribute('aria-label',`${name} · 설비 레벨 ${level} · 인원 ${count} / ${max}`);
 }
 function update(){settings.rooms[slotId]={type,level,count,operators:[]};save();}
 levelInput.addEventListener('change',()=>{level=Number(levelInput.value);renderCount();update();});countInput.addEventListener('change',()=>{count=Number(countInput.value);renderCount();update();});renderCount();decorateRoom(card,type);return card;
}
function privateRoom(slotId,name,saved){
 const card=document.createElement('article');card.className='room room-private';const level=saved?.level??0,count=saved?.count??0;
 const heading=document.createElement('div');heading.className='room-heading';const title=document.createElement('h2');title.textContent=name;heading.append(title);
 const bars=document.createElement('span');bars.className='level-bars';bars.setAttribute('aria-hidden','true');for(let i=0;i<3;i++){const bar=document.createElement('span');bar.className=i<level?'active':'';bars.append(bar);}heading.append(bars);card.append(heading);
 const content=document.createElement('div');content.className='private-occupant';const id=saved?.operators?.[0];
 if(id){
  const image=document.createElement('img');image.src=`https://raw.githubusercontent.com/ArknightsAssets/ArknightsAssets2/cn/assets/dyn/arts/charportraits/${id}_1.png`;image.alt='';image.loading='lazy';image.addEventListener('error',()=>image.hidden=true);
  const details=document.createElement('div');const opName=document.createElement('strong');opName.textContent=characterNames[id]?.name??id;opName.title=opName.textContent;
  const trust=document.createElement('span');trust.className='private-trust';trust.textContent=Number.isInteger(saved.trust?.[id])?`신뢰도 ${saved.trust[id]}%`:'신뢰도 정보 없음';heading.append(trust);details.append(opName);content.append(image,details);
 }else{const empty=document.createElement('span');empty.className='private-empty';empty.textContent=!settings.privateRoomsIncluded?'계정 재조회 필요':!level?'미건설':saved?.occupantsKnown===false?'다시 조회해 주세요':count?'캐릭터 정보 없음':'비어 있음';content.append(empty);}
 card.append(content);const occupancy=document.createElement('span');occupancy.className='room-occupancy';if(saved?.occupantsKnown===false&&level&&settings.privateRoomsIncluded)occupancy.textContent='인원 정보 없음';else showOccupancy(occupancy,settings.privateRoomsIncluded?count:'—',settings.privateRoomsIncluded?(level?1:0):1);card.append(occupancy);
 card.setAttribute('aria-label',`${name} · 레벨 ${level} · ${content.textContent}`);decorateRoom(card,'PRIVATE');return card;
}
function render(){const counters={};const groups={production:document.getElementById('productionRooms'),living:document.getElementById('livingRooms'),support:document.getElementById('supportRooms'),private:document.getElementById('privateRooms')};Object.values(groups).forEach(el=>el.replaceChildren());
 for(const [slotId,group,fallback] of BASE_SLOTS){const saved=settings.rooms[slotId],type=saved?.type??fallback;counters[type]=(counters[type]??0)+1;const name=FACILITIES[type].name+(['TRADING','MANUFACTURE','POWER','DORMITORY','PRIVATE'].includes(type)?` ${counters[type]}`:'');groups[group].append(type==='PRIVATE'?privateRoom(slotId,name,saved):room(slotId,type,name,saved));}statusText();}
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

