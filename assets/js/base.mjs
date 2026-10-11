import {BASE_KEY,BASE_SLOTS,FACILITIES,capacity,readBase} from './base-state.mjs?v=2';
let characterNames={};
fetch('data/account-characters.json').then(r=>r.ok?r.json():null).then(data=>{characterNames=data?.characters??{};render();}).catch(()=>{});
const status=document.getElementById('baseStatus');let settings;
function load(){try{settings=readBase(JSON.parse(localStorage.getItem(BASE_KEY)||'null'));}catch{settings=readBase(null);}}
function statusText(){if(settings.importedAt){const time=new Date(settings.importedAt).toLocaleString('ko-KR');status.textContent=`계정 조회: ${time}${settings.source==='manual'?' · 이후 직접 수정됨':''}`;}else status.textContent='게임 계정 가져오기에서 조회 결과를 적용하면 시설 정보가 자동 반영됩니다.';}
function save(){settings.source='manual';settings.modifiedAt=new Date().toISOString();try{localStorage.setItem(BASE_KEY,JSON.stringify(settings));status.textContent='시설 레벨과 인원수를 저장했습니다.';}catch{status.textContent='이 브라우저에서는 저장할 수 없습니다. 현재 화면에서만 적용됩니다.';}}
function room(slotId,type,name,saved){
 const card=document.createElement('article');card.className=`room room-${FACILITIES[type].css}`;card.setAttribute('aria-label',name);let level=saved?.level??0,count=saved?.count??0;
 card.innerHTML=`<div class="room-heading"><h2>${name}</h2><span class="level-bars" aria-hidden="true"></span><span class="level-text"></span></div><div class="room-occupancy"></div><div class="room-controls"><label class="level-control">Lv. <select aria-label="${name} 설비 레벨"></select></label><label class="count-control">인원 <select aria-label="${name} 배치 인원"></select><span class="capacity"></span></label></div>`;
 const levelInput=card.querySelector('.level-control select'),countInput=card.querySelector('.count-control select'),limit=card.querySelector('.capacity');
 for(let i=0;i<=FACILITIES[type].capacity.length;i++){const o=document.createElement('option');o.value=i;o.textContent=i===0?'미건설':i;levelInput.append(o);}levelInput.value=String(level);
 function renderCount(){const max=capacity(type,level);count=Math.min(count,max);countInput.replaceChildren();for(let i=0;i<=max;i++){const o=document.createElement('option');o.value=i;o.textContent=i;countInput.append(o);}countInput.value=String(count);limit.textContent=` / ${max}`;
 const bars=card.querySelector('.level-bars');bars.replaceChildren();for(let i=0;i<FACILITIES[type].capacity.length;i++){const bar=document.createElement('span');bar.className=i<level?'active':'';bars.append(bar);}
 card.querySelector('.level-text').textContent=level===0?'미건설':`Lv.${level}`;
 card.querySelector('.room-occupancy').textContent=`${count} / ${max}`;
 card.setAttribute('aria-label',`${name} · 설비 레벨 ${level} · 인원 ${count} / ${max}`);
 }
 function update(){settings.rooms[slotId]={type,level,count,operators:[]};save();}
 levelInput.addEventListener('change',()=>{level=Number(levelInput.value);renderCount();update();});countInput.addEventListener('change',()=>{count=Number(countInput.value);renderCount();update();});renderCount();return card;
}
function privateRoom(slotId,name,saved){
 const card=document.createElement('article');card.className='room room-private';const level=saved?.level??0,count=saved?.count??0;
 const heading=document.createElement('div');heading.className='room-heading';const title=document.createElement('h2');title.textContent=name;heading.append(title);
 const bars=document.createElement('span');bars.className='level-bars';bars.setAttribute('aria-hidden','true');for(let i=0;i<3;i++){const bar=document.createElement('span');bar.className=i<level?'active':'';bars.append(bar);}heading.append(bars);card.append(heading);
 const content=document.createElement('div');content.className='private-occupant';const id=saved?.operators?.[0];
 if(id){
  const image=document.createElement('img');image.src=`https://raw.githubusercontent.com/ArknightsAssets/ArknightsAssets2/cn/assets/dyn/arts/charportraits/${id}_1.png`;image.alt='';image.loading='lazy';image.addEventListener('error',()=>image.hidden=true);
  const details=document.createElement('div');const opName=document.createElement('strong');opName.textContent=characterNames[id]?.name??id;opName.title=opName.textContent;
  const trust=document.createElement('span');trust.className='private-trust';trust.textContent=Number.isInteger(saved.trust?.[id])?`신뢰도 ${saved.trust[id]}%`:'신뢰도 정보 없음';details.append(opName,trust);content.append(image,details);
 }else{const empty=document.createElement('span');empty.className='private-empty';empty.textContent=!settings.privateRoomsIncluded?'계정 재조회 필요':!level?'미건설':saved?.occupantsKnown===false?'다시 조회해 주세요':count?'캐릭터 정보 없음':'비어 있음';content.append(empty);}
 card.append(content);const occupancy=document.createElement('span');occupancy.className='room-occupancy';occupancy.textContent=saved?.occupantsKnown===false&&level?'인원 정보 없음':`${count} / ${level?1:0}`;card.append(occupancy);
 card.setAttribute('aria-label',`${name} · 레벨 ${level} · ${content.textContent}`);return card;
}
function render(){const counters={};const groups={production:document.getElementById('productionRooms'),living:document.getElementById('livingRooms'),support:document.getElementById('supportRooms'),private:document.getElementById('privateRooms')};Object.values(groups).forEach(el=>el.replaceChildren());
 for(const [slotId,group,fallback] of BASE_SLOTS){const saved=settings.rooms[slotId],type=saved?.type??fallback;counters[type]=(counters[type]??0)+1;const name=FACILITIES[type].name+(['TRADING','MANUFACTURE','POWER','DORMITORY','PRIVATE'].includes(type)?` ${counters[type]}`:'');groups[group].append(type==='PRIVATE'?privateRoom(slotId,name,saved):room(slotId,type,name,saved));}statusText();}
load();render();window.addEventListener('storage',e=>{if(e.key===BASE_KEY||e.key===null){load();render();}});window.addEventListener('pageshow',()=>{load();render();});

const editButton=document.getElementById('editFacilities');editButton.addEventListener('click',()=>{const editing=editButton.getAttribute('aria-pressed')!=='true';editButton.setAttribute('aria-pressed',String(editing));editButton.textContent=editing?'설비 설정 완료':'설비 설정';document.getElementById('baseMap').classList.toggle('editing',editing);});
