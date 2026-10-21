/* Z.O.O.T. shared appearance and navigation. No account or progress keys are modified. */
(()=>{
'use strict';
const KEY='zootAppearance';
const system=matchMedia('(prefers-color-scheme: dark)');
let preference='system';
try{const saved=localStorage.getItem(KEY);if(['system','light','dark'].includes(saved))preference=saved;}catch{}
function applyTheme(){document.documentElement.dataset.theme=preference==='system'?(system.matches?'dark':'light'):preference;}
applyTheme();system.addEventListener('change',()=>{if(preference==='system')applyTheme();});
window.addEventListener('storage',event=>{if(event.key===KEY){preference=['light','dark'].includes(event.newValue)?event.newValue:'system';applyTheme();}});
const icon={home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9"/></svg>',menu:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',theme:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4v16"/><path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor"/></svg>'};
function setup(){
const page=location.pathname.split('/').pop()||'index.html',home=page==='index.html';
if(!home)return;document.body.classList.add('zoot-home');
const styleButton=()=>`<button type="button" class="zoot-icon" data-zoot-theme aria-label="화면 모드 설정">${icon.theme}</button>`;
if(home){const holder=document.createElement('div');holder.innerHTML=styleButton();holder.firstElementChild.classList.add('zoot-theme-home');document.body.append(holder.firstElementChild);}
const theme=document.createElement('dialog');theme.className='zoot-dialog';theme.id='zootThemeDialog';theme.setAttribute('aria-labelledby','zootThemeTitle');theme.innerHTML=`<div class="zoot-dialog-heading"><h2 id="zootThemeTitle">화면 모드</h2><button type="button" class="zoot-icon" data-zoot-close aria-label="닫기">${icon.close}</button></div><form id="zootThemeForm"><label><input type="radio" name="appearance" value="system">기기 설정 따르기</label><label><input type="radio" name="appearance" value="light">라이트</label><label><input type="radio" name="appearance" value="dark">다크</label><div class="zoot-actions"><button class="zoot-button" type="button" data-zoot-close>취소</button><button class="zoot-button zoot-button-primary" type="submit">적용</button></div></form>`;document.body.append(theme);
let themeOpener;
document.querySelectorAll('[data-zoot-theme]').forEach(button=>button.addEventListener('click',()=>{themeOpener=button;theme.querySelector(`input[value="${preference}"]`).checked=true;theme.showModal();}));
const toast=document.createElement('div');toast.className='zoot-toast';toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');toast.hidden=true;document.body.append(toast);let toastTimer;
window.zootNotify=message=>{toast.textContent=message;toast.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast.hidden=true;},3000);};
theme.querySelector('form').addEventListener('submit',event=>{event.preventDefault();preference=new FormData(event.currentTarget).get('appearance');try{localStorage.setItem(KEY,preference);}catch{}applyTheme();theme.close();window.zootNotify('설정 저장됨');});
theme.addEventListener('close',()=>themeOpener?.focus());
document.querySelectorAll('dialog').forEach(dialog=>{
 dialog.querySelectorAll('[data-zoot-close]').forEach(button=>button.addEventListener('click',()=>dialog.close()));
 // A drag that started inside must not dismiss the dialog when released outside.
 let outside=false;dialog.addEventListener('pointerdown',event=>{const r=dialog.getBoundingClientRect();outside=event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom;});
 dialog.addEventListener('click',event=>{const r=dialog.getBoundingClientRect();if(outside&&event.target===dialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))dialog.close();outside=false;});
});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
