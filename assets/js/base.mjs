function room(type,name){
 const button=document.createElement('button');
 button.type='button';button.className=`room room-${type}`;button.setAttribute('aria-pressed','false');button.setAttribute('aria-label',name);
 button.textContent=name;
 button.addEventListener('click',()=>{document.querySelectorAll('.room').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));});
 return button;
}
const production=[['trading','무역소 1'],['factory','제조소 1'],['power','발전소 1'],['trading','무역소 2'],['factory','제조소 2'],['power','발전소 2'],['factory','제조소 3'],['factory','제조소 4'],['power','발전소 3']];
production.forEach(([type,name])=>document.getElementById('productionRooms').append(room(type,name)));
const living=document.getElementById('livingRooms');living.append(room('control','제어 센터'));for(let i=1;i<=4;i++)living.append(room('dorm',`숙소 ${i}`));
[['reception','응접실'],['workshop','가공소'],['office','사무실'],['training','훈련실']].forEach(([type,name])=>document.getElementById('supportRooms').append(room(type,name)));
