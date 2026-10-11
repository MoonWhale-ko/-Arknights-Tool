const storageKey='arknightsBaseLayoutV1';
const capacities={"trading": [1, 2, 3], "factory": [1, 2, 3], "power": [1, 1, 1], "control": [1, 2, 3, 4, 5], "dorm": [5, 5, 5, 5, 5], "reception": [2, 2, 2], "workshop": [1, 1, 1], "office": [1, 1, 1], "training": [2, 2, 2]};
let settings={};
try{const stored=JSON.parse(localStorage.getItem(storageKey)||'{}');if(stored && typeof stored==='object' && !Array.isArray(stored))settings=stored;}catch{}
const status=document.getElementById('baseStatus');
function integer(value,min,max,fallback){const n=Number(value);return Number.isInteger(n)?Math.min(max,Math.max(min,n)):fallback;}
function save(){try{localStorage.setItem(storageKey,JSON.stringify(settings));status.textContent='시설 레벨과 인원수를 저장했습니다.';}catch{status.textContent='이 브라우저에서는 저장할 수 없습니다. 현재 화면에서만 적용됩니다.';}}
function room(type,name){
 const card=document.createElement('article');card.className=`room room-${type}`;card.setAttribute('aria-label',name);
 const saved=settings[name]||{};let level=integer(saved.level,1,capacities[type].length,1);let count=integer(saved.count,0,capacities[type][level-1],0);
 card.innerHTML=`<h2>${name}</h2><div class="room-controls"><label class="level-control">Lv. <select aria-label="${name} 설비 레벨"></select></label><label class="count-control">인원 <select aria-label="${name} 배치 인원"></select><span class="capacity"></span></label></div>`;
 const levelInput=card.querySelector('.level-control select');const countInput=card.querySelector('.count-control select');const limit=card.querySelector('.capacity');
 for(let i=1;i<=capacities[type].length;i++){const o=document.createElement('option');o.value=i;o.textContent=i;levelInput.append(o);}levelInput.value=String(level);
 function renderCount(){const capacity=capacities[type][level-1];count=Math.min(count,capacity);countInput.replaceChildren();for(let i=0;i<=capacity;i++){const o=document.createElement('option');o.value=i;o.textContent=i;countInput.append(o);}countInput.value=String(count);limit.textContent=` / ${capacity}`;}
 function update(){settings[name]={level,count};save();}
 levelInput.addEventListener('change',()=>{level=Number(levelInput.value);renderCount();update();});countInput.addEventListener('change',()=>{count=Number(countInput.value);update();});renderCount();return card;
}
const production=[['trading','무역소 1'],['factory','제조소 1'],['power','발전소 1'],['trading','무역소 2'],['factory','제조소 2'],['power','발전소 2'],['factory','제조소 3'],['factory','제조소 4'],['power','발전소 3']];
production.forEach(([type,name])=>document.getElementById('productionRooms').append(room(type,name)));
const living=document.getElementById('livingRooms');living.append(room('control','제어 센터'));for(let i=1;i<=4;i++)living.append(room('dorm',`숙소 ${i}`));
[['reception','응접실'],['workshop','가공소'],['office','사무실'],['training','훈련실']].forEach(([type,name])=>document.getElementById('supportRooms').append(room(type,name)));
