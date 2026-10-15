import {makeSubmission} from './base-share.mjs';
export function offerShare(target,input,result){
 if(result.status!=='recommended')return;
 const section=document.createElement('section');section.className='optimizer-share';
 const title=document.createElement('h3');title.textContent='이번 계산 결과를 공유하시겠습니까?';
 const notice=document.createElement('p');notice.textContent='보유 오퍼레이터·정예화·레벨, 시설·생산·숙소 설정과 추천 배치를 전송합니다. 검증 후 계산 로직 개선을 위한 분석 자료로 GitHub에 공개될 수 있습니다. 이메일·UID·인증 정보는 포함하지 않습니다. 동의는 이번 결과에만 적용됩니다.';
 const status=document.createElement('p');status.setAttribute('role','status');
 const details=document.createElement('details'),summary=document.createElement('summary'),preview=document.createElement('pre');summary.textContent='공유할 데이터 확인';details.append(summary,preview);
 const yes=document.createElement('button'),no=document.createElement('button');yes.type=no.type='button';yes.textContent='동의하고 공유';no.textContent='공유 안 함';
 let payload;try{payload=makeSubmission(input.data,input.base,input.progress,input.products,input.options,result);preview.textContent=JSON.stringify(payload,null,2);}catch{status.textContent='이 결과의 공유 데이터를 만들지 못했습니다.';yes.disabled=true;}
 no.onclick=()=>{section.replaceChildren();section.append(status);status.textContent='공유하지 않았습니다.';};
 yes.onclick=async()=>{
  yes.disabled=true;no.disabled=true;status.textContent='제출 중…';const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{
   const url=new URL(window.ARKNIGHTS_ACCOUNT_API);if(url.protocol!=='https:'||url.username||url.password)throw Error('연결 설정을 확인해 주세요.');
   url.pathname='/optimizer-submissions';url.search='';url.hash='';
   const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',body:JSON.stringify(payload),signal:controller.signal});
   const body=await response.json();if(!response.ok||body.ok!==true)throw Error(response.status===404||body.error==='sharing-not-configured'?'공유 저장소 연결 준비 중입니다. 아직 제출되지 않았습니다.':response.status===429?'제출 횟수가 많습니다. 잠시 후 다시 시도해 주세요.':'저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
   status.textContent='접수되었습니다. 검증 후 계산 로직 개선을 위한 분석 자료로 사용합니다.';yes.remove();no.remove();
  }catch(error){status.textContent=error.name==='AbortError'?'응답 시간이 초과되었습니다. 접수 여부를 확인하지 못했습니다. 재시도해도 같은 결과는 중복 저장하지 않습니다.':error.message;yes.disabled=false;no.disabled=false;}finally{clearTimeout(timer);}
 };
 section.append(title,notice,details,yes,no,status);target.append(section);
}
