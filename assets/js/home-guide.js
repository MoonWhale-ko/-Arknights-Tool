/* Home help stays separate from saved account and operator data. */
(()=>{
'use strict';
function setup(){
 const controls=document.querySelector('.zoot-home-controls'),button=document.getElementById('zootGuideOpen');
 if(!controls||!button)return;
 const theme=document.querySelector('.zoot-theme-home');
 if(theme){theme.classList.remove('zoot-theme-home');controls.append(theme);}
 const guide=document.createElement('dialog');guide.id='zootHomeGuide';guide.className='zoot-dialog zoot-home-guide';guide.setAttribute('aria-labelledby','zootHomeGuideTitle');
 guide.innerHTML=`<div class="zoot-dialog-heading"><h2 id="zootHomeGuideTitle">사용 가이드</h2><button type="button" class="zoot-icon" aria-label="가이드 닫기" data-guide-close><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>
 <div id="zootGuideChoices"><p class="zoot-guide-intro">안내를 볼 기능을 선택해 주세요.</p><div class="zoot-guide-grid" aria-label="가이드 기능 선택">${['공개모집 계산기','오퍼레이터','육성 계획','육성 재료','창고','기반시설'].map((name,index)=>`<button type="button" class="zoot-guide-choice" data-guide-feature="${index}">${name}</button>`).join('')}</div></div>
 <div class="zoot-actions"><button type="button" class="zoot-button" data-guide-close>닫기</button></div>`;
 document.body.append(guide);
 const destinations=['recruitment.html?guide=recruitment','operators.html?guide=operators','plans.html?guide=plans','materials.html?guide=materials','backpack.html?guide=backpack','base.html?guide=base'];
 button.addEventListener('click',()=>guide.showModal());
 guide.querySelectorAll('[data-guide-feature]').forEach(choice=>choice.addEventListener('click',()=>{location.href=destinations[Number(choice.dataset.guideFeature)];}));
 guide.querySelectorAll('[data-guide-close]').forEach(close=>close.addEventListener('click',()=>guide.close()));
 guide.addEventListener('close',()=>button.focus());
}
if(document.readyState!=='complete')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
