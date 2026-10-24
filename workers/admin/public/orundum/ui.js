import {calculate,summarize} from './engine.mjs';
const $=id=>document.getElementById(id),labels={remaining:'미수령',claimed:'수령 완료',unknown:'확인 필요'};
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
let catalog,data,result;
const message=text=>$('orMessage').textContent=text;
async function load(){if(!catalog){const r=await fetch('/orundum/catalog.json');if(!r.ok)throw Error('합성옥 기준 데이터를 불러오지 못했습니다.');catalog=await r.json();}}
function clear(){data=null;result=null;$('orResult').hidden=true;message('테스트 계정 데이터를 지웠습니다.');}
function extraSection(result){
 const extra=result.additional,box=$('orAdditional');box.replaceChildren();
 $('orAdditionalTotal').textContent=extra.totals.remaining.toLocaleString();
 $('orAdditionalUnknown').textContent=extra.totals.unknown.toLocaleString();
 const groups=new Map();for(const r of extra.rewards){if(!groups.has(r.name))groups.set(r.name,[]);groups.get(r.name).push(r);}
 for(const [name,rows]of groups){const d=node('details',undefined,'mine-group');d.append(node('summary',name));const body=node('div',undefined,'mine-excluded-body');
  for(const r of rows){const n=node('div',undefined,'or-reward');n.append(node('strong',r.title),node('span',labels[r.status],'mine-status '+r.status),node('b',r.amount.toLocaleString()+' 합성옥'),node('p',r.access+' · '+r.condition),node('p',r.reason));body.append(n);}d.append(body);box.append(d);}
 const shops=$('orShop');shops.replaceChildren();
 for(const r of extra.shops){const n=node('div',undefined,'or-weekly');n.append(node('h3',r.name+' · '+r.title),node('strong',r.amount===null?'무제한':r.amount.toLocaleString()+'개'),node('p',r.condition+' · '+r.access),node('p',r.affordable===null?'현재 재화로 교환 가능한 양은 확인 필요':`해당 상품만 구매할 경우 현재 재화로 ${r.affordable.toLocaleString()}개 교환 가능`));shops.append(n);}
 if(!extra.shops.length)shops.append(node('p','상품 목록을 함께 가져오면 잔여 교환량을 계산합니다. 기존 JSON은 계정을 다시 가져와 주세요.','hint'));
 const random=$('orRandom');random.replaceChildren();for(const r of extra.random)random.append(node('p',r.name+' · '+r.condition+' · '+r.reason));
 const notes=$('orAdditionalNotes');notes.replaceChildren();for(const text of extra.notes)notes.append(node('p',text));
}
function render(){
 if(!data)return;
 result=calculate(catalog,data);extraSection(result);
 $('orResult').hidden=false;
 $('orRemaining').textContent=result.totals.remaining.toLocaleString();$('orClaimed').textContent=result.totals.claimed.toLocaleString();$('orUnknown').textContent=result.totals.unknown.toLocaleString();
 $('orSource').textContent='계정 조회 '+(data.importedAt?new Date(data.importedAt).toLocaleString('ko-KR'):'시각 미상')+' · 계산 '+new Date(result.calculatedAt).toLocaleString('ko-KR');
 const w=result.weekly;
 $('orWeekly').textContent=w.remaining===null?'새 계정 데이터 필요':w.remaining.toLocaleString();
 $('orWeeklyNote').textContent=w.stale?'한국 서버 주간 갱신이 지난 파일이거나 조회 시각이 없습니다. 새로 가져오세요.':w.cap===null?'주간 획득량·상한을 확인할 수 없습니다.':`조회 당시 ${w.obtained.toLocaleString()} / ${w.cap.toLocaleString()} 획득 · 상한을 추가로 확장했을 때의 보상은 포함하지 않습니다.`;
 const q=$('orSearch').value.trim().toLowerCase(),category=$('orCategory').value,status=$('orStatus').value;
 const filtered=result.rows.filter(r=>(!category||r.category===category)&&(!status||r.status===status)&&(!q||[r.name,r.title,r.id].join(' ').toLowerCase().includes(q)));
 const box=$('orGroups'),opened=new Set([...box.querySelectorAll('details[open]')].map(x=>x.dataset.key));box.replaceChildren();
 const groups=new Map();for(const row of filtered){const k=row.category+'|'+row.name;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(row);}
 $('orCount').textContent=`${filtered.length}개 보상 · 검색 조건 내 미수령 ${summarize(filtered).remaining.toLocaleString()}개`;
 for(const [key,rows]of groups){
  const total=summarize(rows),detail=node('details',undefined,'mine-group'),head=node('summary');detail.dataset.key=key;detail.open=opened.has(key);
  head.append(node('b',rows[0].name),node('span',`미수령 ${total.remaining.toLocaleString()} · 완료 ${total.claimed.toLocaleString()}`));detail.append(head);
  const body=node('div',undefined,'mine-excluded-body');
  for(const row of rows){const entry=node('div',undefined,'or-reward');entry.append(node('strong',row.title),node('span',labels[row.status],'mine-status '+row.status),node('b',row.amount.toLocaleString()+' 합성옥'),node('p',row.access+' · '+row.condition),node('p',(row.openKind?row.openKind+' · ':'')+row.reason));body.append(entry);}
  detail.append(body);box.append(detail);
 }
 if(!groups.size)box.append(node('p','조건에 맞는 보상이 없습니다.','empty'));
 const excluded=$('orExcluded');excluded.replaceChildren();
 const reasons=new Map();for(const row of result.excluded){const key=row.exclusion;if(!reasons.has(key))reasons.set(key,[]);reasons.get(key).push(row);}
 for(const [reason,rows]of reasons){const d=node('details',undefined,'mine-group');d.append(node('summary',reason+' · '+rows.length+'개'),node('p',rows.map(r=>r.name).join(', '),'mine-excluded-body'));excluded.append(d);}
 message('일회성 보상, 현재 기간의 임무·출석·월정액 보상, 상점 교환을 각각 계산했습니다. 주간 섬멸과 랜덤 보상도 별도로 표시합니다.');
}
async function accept(value){await load();calculate(catalog,value);data=value;render();}
$('orUseAccount').onclick=()=>window.dispatchEvent(new Event('orundum-request-account'));
window.addEventListener('orundum-account',e=>{if(!e.detail){message('계정 원본 데이터 탭에서 먼저 계정을 가져오거나 JSON 파일을 선택하세요.');return;}accept(e.detail).catch(e=>message(e.message));});
window.addEventListener('orundum-clear',clear);$('orClear').onclick=clear;
$('orFile').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>30*1024*1024)throw Error('30MB 이하의 계정 JSON을 선택하세요.');await accept(JSON.parse(await f.text()));}catch(error){message(error.message);}finally{e.target.value='';}};
for(const id of ['orSearch','orCategory','orStatus'])$(id).addEventListener(id==='orSearch'?'input':'change',render);
$('orExport').onclick=()=>{if(!result)return;const b=new Blob([JSON.stringify({...result,catalogRevision:catalog.revision},null,2)],{type:'application/json'}),url=URL.createObjectURL(b),a=node('a');a.href=url;a.download='zoot-orundum-test.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
setInterval(()=>{if(data)render();},60000);
