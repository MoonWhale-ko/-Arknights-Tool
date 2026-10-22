// Reuse each page's account UI; mount the existing importer on other pages on demand.
let loading;
async function prepare(){
 let trigger=document.getElementById('gameImport');
 if(!trigger){
  trigger=document.createElement('button');trigger.id='gameImport';trigger.type='button';trigger.hidden=true;
  document.body.append(trigger);
 }
 let dialog=document.getElementById('accountDialog');
 if(!dialog){
  const holder=document.createElement('div');holder.innerHTML="<dialog id=\"accountDialog\" class=\"account-dialog\" aria-labelledby=\"accountTitle\">\n<h2 id=\"accountTitle\">게임 계정 가져오기</h2>\n<p class=\"muted\">한국 서버 · 요스타 이메일 인증</p>\n<p>조회하면 현재 게임 접속이 종료될 수 있습니다. 이메일과 인증번호는 계정 조회에만 사용하며, 육성·재료·기반시설 정보는 이 브라우저에 저장합니다.</p>\n<form id=\"accountForm\">\n<label>요스타 연동 이메일<input id=\"accountEmail\" type=\"email\" autocomplete=\"off\" maxlength=\"254\" required></label>\n<button class=\"btn\" id=\"accountSend\" type=\"button\">인증번호 받기</button>\n<label>인증번호<input id=\"accountCode\" type=\"text\" inputmode=\"numeric\" autocomplete=\"off\" pattern=\"[0-9]{6}\" maxlength=\"6\" required></label>\n<button class=\"btn\" id=\"accountFetch\" type=\"submit\">현재 상태 조회</button>\n</form>\n<div id=\"accountMessage\" class=\"account-message\" role=\"status\" aria-live=\"polite\"></div>\n<div class=\"account-actions\"><button class=\"btn\" id=\"accountApply\" disabled>조회 결과 적용</button><button class=\"btn\" id=\"accountUndo\">가져오기 전으로 복원</button><button class=\"btn\" id=\"accountClose\">닫기</button></div>\n</dialog>";
  dialog=holder.firstElementChild;document.body.append(dialog);
 }
 dialog.classList.add('zoot-account-dialog');
 if(typeof trigger.onclick!=='function'){
  await import('./account-config.js');
  await import('./account-import.mjs?v=10');
 }
 if(typeof trigger.onclick!=='function')throw Error('Account importer unavailable');
 return {trigger,dialog};
}
export async function openAccountImport(drawer){
 if(!loading)loading=prepare().catch(error=>{loading=null;throw error;});
 const {trigger,dialog}=await loading;
 drawer?.close();
 dialog.addEventListener('close',()=>document.getElementById('zootMenuOpen')?.focus(),{once:true});
 trigger.click();
 if(dialog.open)dialog.querySelector('#accountEmail')?.focus();
}
