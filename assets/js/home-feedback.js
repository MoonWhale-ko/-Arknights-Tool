/* Set data-feedback-url on the home button when the contact destination is ready. */
(()=>{
 'use strict';
 const button=document.getElementById('zootFeedbackOpen'),status=document.getElementById('zootFeedbackStatus');
 if(!button||!status)return;
 let timer;
 button.addEventListener('click',()=>{
  const url=button.dataset.feedbackUrl.trim();
  if(url){location.href=url;return;}
  clearTimeout(timer);status.textContent='준비 중입니다.';status.hidden=false;
  timer=setTimeout(()=>{status.hidden=true;},3000);
 });
})();
