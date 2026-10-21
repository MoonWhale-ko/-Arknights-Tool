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
document.body.classList.add(home?'zoot-home':'zoot-page');
const styleButton=()=>`<button type="button" class="zoot-icon" data-zoot-theme aria-label="화면 모드 설정">${icon.theme}</button>`;
if(home){const holder=document.createElement('div');holder.innerHTML=styleButton();holder.firstElementChild.classList.add('zoot-theme-home');document.body.append(holder.firstElementChild);}
else{
 const navigationPages=[['index.html','홈',''],['recruitment.html','공개모집 계산기','Recruit'],['operators.html','오퍼레이터','Operator'],['base.html','기반시설','Base'],['backpack.html','창고','Depot'],['plans.html','육성 계획',''],['materials.html','육성 재료','']];
 const bar=document.createElement('div');bar.className='zoot-topbar';bar.setAttribute('role','navigation');bar.setAttribute('aria-label','공통 이동');bar.innerHTML=`<a class="zoot-icon" href="index.html" aria-label="홈">${icon.home}</a><span class="zoot-brand-small">Z.O.O.T.</span><button type="button" class="zoot-icon" id="zootMenuOpen" aria-label="더보기 메뉴 열기" aria-expanded="false" aria-controls="zootNavigation">${icon.menu}</button>`;document.body.prepend(bar);
 const drawer=document.createElement('dialog');drawer.className='zoot-dialog zoot-drawer';drawer.id='zootNavigation';drawer.setAttribute('aria-labelledby','zootNavTitle');drawer.innerHTML=`<div class="zoot-dialog-heading"><h2 id="zootNavTitle">페이지 이동</h2><button type="button" class="zoot-icon" data-zoot-close aria-label="메뉴 닫기">${icon.close}</button></div><nav aria-label="상세 페이지 이동">${navigationPages.map(([url,label,image])=>`<a href="${url}" ${url===page?'aria-current="page"':''}>${image?`<img src="assets/icons/${image}_iconv2.svg" width="26" height="26" alt="">`:url==='index.html'?icon.home:'<span class="zoot-nav-spacer" aria-hidden="true"></span>'}<span>${label}</span></a>`).join('')}</nav><div class="zoot-drawer-settings"><span>화면 모드</span>${styleButton()}</div>`;document.body.append(drawer);
 const open=document.getElementById('zootMenuOpen');open.addEventListener('click',()=>{drawer.showModal();open.setAttribute('aria-expanded','true');});drawer.addEventListener('close',()=>open.setAttribute('aria-expanded','false'));
}
const theme=document.createElement('dialog');theme.className='zoot-dialog';theme.id='zootThemeDialog';theme.setAttribute('aria-labelledby','zootThemeTitle');theme.innerHTML=`<div class="zoot-dialog-heading"><h2 id="zootThemeTitle">화면 모드</h2><button type="button" class="zoot-icon" data-zoot-close aria-label="닫기">${icon.close}</button></div><form id="zootThemeForm"><label><input type="radio" name="appearance" value="system">기기 설정 따르기</label><label><input type="radio" name="appearance" value="light">라이트</label><label><input type="radio" name="appearance" value="dark">다크</label><div class="zoot-actions"><button class="zoot-button" type="button" data-zoot-close>취소</button><button class="zoot-button zoot-button-primary" type="submit">적용</button></div></form>`;document.body.append(theme);
let themeOpener;
document.querySelectorAll('[data-zoot-theme]').forEach(button=>button.addEventListener('click',()=>{themeOpener=button;theme.querySelector(`input[value="${preference}"]`).checked=true;theme.showModal();}));
const toast=document.createElement('div');toast.className='zoot-toast';toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');toast.hidden=true;document.body.append(toast);let toastTimer;
window.zootNotify=message=>{toast.textContent=message;toast.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast.hidden=true;},3000);};
theme.querySelector('form').addEventListener('submit',event=>{event.preventDefault();preference=new FormData(event.currentTarget).get('appearance');try{localStorage.setItem(KEY,preference);}catch{}applyTheme();theme.close();window.zootNotify('설정 저장됨');});
theme.addEventListener('close',()=>themeOpener?.focus());
document.querySelectorAll('dialog.zoot-dialog').forEach(dialog=>{
 let closing=false;function dismiss(){if(closing||!dialog.open)return;if(!dialog.classList.contains('zoot-drawer')||matchMedia('(prefers-reduced-motion: reduce)').matches){dialog.close();return;}closing=true;const motion=dialog.animate([{transform:'translateX(0)',opacity:1},{transform:'translateX(32px)',opacity:0}],{duration:160,easing:'ease-in',fill:'forwards'});const finish=()=>{if(!closing)return;dialog.close();motion.cancel();closing=false;};motion.finished.then(finish,finish);setTimeout(finish,220);}dialog.addEventListener('cancel',event=>{event.preventDefault();dismiss();});dialog.querySelectorAll('[data-zoot-close]').forEach(button=>button.addEventListener('click',dismiss));
 // A drag that started inside must not dismiss the dialog when released outside.
 let outside=false;dialog.addEventListener('pointerdown',event=>{const r=dialog.getBoundingClientRect();outside=event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom;});
 dialog.addEventListener('click',event=>{const r=dialog.getBoundingClientRect();if(outside&&event.target===dialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))dismiss();outside=false;});
});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
