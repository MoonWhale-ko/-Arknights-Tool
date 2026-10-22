/* Home help stays separate from saved account and operator data. */
(()=>{
'use strict';
function setup(){
 const theme=document.querySelector('.zoot-theme-home');
 if(!theme)return;
 const controls=document.createElement('div');controls.className='zoot-home-controls';controls.setAttribute('role','group');controls.setAttribute('aria-label','가이드와 화면 설정');
 theme.before(controls);theme.classList.remove('zoot-theme-home');
 const button=document.createElement('button');button.type='button';button.className='zoot-button zoot-guide-open';button.textContent='가이드 보기';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls','zootHomeGuide');controls.append(button,theme);
 const guide=document.createElement('dialog');guide.id='zootHomeGuide';guide.className='zoot-dialog zoot-home-guide';guide.setAttribute('aria-labelledby','zootHomeGuideTitle');
 guide.innerHTML=`<div class="zoot-dialog-heading"><h2 id="zootHomeGuideTitle">사용 가이드</h2><button type="button" class="zoot-icon" aria-label="가이드 닫기" data-guide-close><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>
 <p class="zoot-guide-intro">가이드를 준비 중입니다.</p>
 <div class="zoot-actions"><button type="button" class="zoot-button" data-guide-close>닫기</button></div>`;
 document.body.append(guide);
 button.addEventListener('click',()=>guide.showModal());
 guide.querySelectorAll('[data-guide-close]').forEach(close=>close.addEventListener('click',()=>guide.close()));
 guide.addEventListener('close',()=>button.focus());
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
