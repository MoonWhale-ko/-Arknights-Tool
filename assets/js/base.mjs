const icons = {
 trading: '<path d="M4 8h24v17H4zM8 8V4h16v4M9 14h14M9 19h8"/><path d="m23 17 4 4-4 4"/>',
 factory: '<path d="M4 27V13l8 4v-7l8 5V5h5v22ZM8 22h2m5 0h2m5 0h2"/>',
 power: '<path d="M18 3 7 18h9l-2 11 11-16h-9Z"/>',
 control: '<path d="m16 3 12 7v13l-12 7-12-7V10ZM4 10l12 7 12-7M16 17v13M10 7l12 7"/>',
 dorm: '<path d="M4 27V6m0 15h24v6M4 13h9v8M13 16h11a4 4 0 0 1 4 4v1"/>',
 reception: '<path d="M9 5h14v23H9ZM13 10h6m-6 5h6m-6 5h6M5 12H2v16h7m14-16h7v16h-7"/>',
 workshop: '<path d="m21 4 3 6 6 3-6 3-3 6-3-6-6-3 6-3ZM5 19l8 8M4 28l9-9"/>',
 office: '<path d="M4 10h24v18H4ZM11 10V5h10v5M4 16h24M13 16v5h6v-5"/>',
 training: '<path d="m6 3 21 21-3 3L3 6Zm-1 17 7 7m-5-3-4 5m17-24 7 7m-3-5 5-4"/>'
};
const descriptions = {trading:'생산시설 구역 · 무역소',factory:'생산시설 구역 · 제조소',power:'생산시설 구역 · 발전소',control:'상층 중앙 · 제어 센터',dorm:'중앙 거주 구역 · 숙소',reception:'우측 상층 · 응접실',workshop:'우측 1층 · 가공소',office:'우측 2층 · 사무실',training:'우측 3층 · 훈련실'};
function room(type,name,code,index){
 const button=document.createElement('button');
 button.type='button';button.className=`room room-${type}`;button.setAttribute('aria-pressed','false');button.setAttribute('aria-label',name);
 button.innerHTML=`<span class="room-code">${code}</span><span class="room-art" aria-hidden="true"><span class="room-window"></span><span class="room-console"></span><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">${icons[type]}</svg></span><span class="room-label">${name}</span><span class="room-floor" aria-hidden="true">${index}</span>`;
 button.addEventListener('click',()=>{document.querySelectorAll('.room').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));document.getElementById('selectedName').textContent=name;document.getElementById('selectedDescription').textContent=descriptions[type];});
 return button;
}
const production=[['trading','무역소 1'],['factory','제조소 1'],['power','발전소 1'],['trading','무역소 2'],['factory','제조소 2'],['power','발전소 2'],['factory','제조소 3'],['factory','제조소 4'],['power','발전소 3']];
production.forEach(([type,name],i)=>document.getElementById('productionRooms').append(room(type,name,`B${Math.floor(i/3)+1} / 0${i%3+1}`,String(Math.floor(i/3)+1)+'F')));
const living=document.getElementById('livingRooms');living.append(room('control','제어 센터','CONTROL','CC'));for(let i=1;i<=4;i++)living.append(room('dorm',`숙소 ${i}`,`DORMITORY / 0${i}`,`${i}F`));
[['reception','응접실'],['workshop','가공소'],['office','사무실'],['training','훈련실']].forEach(([type,name],i)=>document.getElementById('supportRooms').append(room(type,name,'SUPPORT / 0'+(i+1),i===0?'TOP':`${i}F`)));
