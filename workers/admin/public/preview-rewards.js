import {audit,totals} from '/mining/engine.mjs';
import {calculate} from '/orundum/engine.mjs';
import {REWARDS_KEY} from './assets/js/account-state.mjs?v=9';
import {openAccountImport} from './assets/js/account-menu.mjs';
const $=id=>document.getElementById(id),labels={remaining:'미수령',claimed:'수령 완료',unknown:'확인 필요'};
const n=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
let account,rows=[],catalogs;
const unit=r=>r.currency==='originite'?'순오리지늄':'합성옥';
function render(){
 const query=$('rewardsSearch').value.trim().toLowerCase(),currency=$('rewardsCurrency').value,status=$('rewardsStatus').value;
 const filtered=rows.filter(r=>(!currency||r.currency===currency)&&(!status||r.status===status)&&(!query||[r.group,r.title,r.name,r.id].join(' ').toLowerCase().includes(query)));
 const box=$('rewardsGroups'),open=new Set([...box.querySelectorAll('details[open]')].map(d=>d.dataset.key));box.replaceChildren();
 const groups=new Map();for(const row of filtered){const key=row.currency+'|'+row.group;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
 $('rewardsCount').textContent=`${filtered.length.toLocaleString()}개 보상`;
 for(const [key,list] of groups){const d=n('details',undefined,'reward-group');d.dataset.key=key;d.open=open.has(key);const h=n('summary');const remaining=list.filter(r=>r.status==='remaining').reduce((a,r)=>a+r.amount,0);h.append(n('b',list[0].group),n('span',`${unit(list[0])} · 미수령 ${remaining.toLocaleString()}`));d.append(h);for(const r of list){const e=n('article',undefined,'reward-row');e.append(n('strong',r.title),n('span',labels[r.status],'reward-status '+r.status),n('b',r.amount.toLocaleString()+' '+unit(r)),n('p',r.access),n('small',r.reason));d.append(e);}box.append(d);}
 if(!groups.size)box.append(n('p','조건에 맞는 보상이 없습니다.','reward-empty'));
}
async function accept(value){
 if(!value)return;
 try{
  if(!catalogs)catalogs=await Promise.all(['/mining/catalog.json','/orundum/catalog.json'].map(async url=>{const r=await fetch(url);if(!r.ok)throw Error('보상 기준 데이터를 불러오지 못했습니다.');return r.json();}));
  const mine=audit(catalogs[0],value),or=calculate(catalogs[1],value);
  account=value;
  rows=[...mine.included.map(r=>({...r,currency:'originite',amount:r.op,title:r.code+' · '+r.mode})),...or.rows.map(r=>({...r,currency:'orundum',group:r.category==='paradox'?'역설 시뮬레이션':r.name,title:r.category==='paradox'?r.name:r.title}))];
  $('rewardsOriginite').textContent=totals(mine.included).remaining.toLocaleString();$('rewardsOrundum').textContent=or.totals.remaining.toLocaleString();
  const unknown=rows.filter(r=>r.status==='unknown').length;
  $('rewardsMessage').textContent='가져온 계정의 일회성 보상을 계산했습니다.'+(unknown?` 수령 여부 확인 필요 ${unknown}개는 합계에서 제외했습니다.`:'');
  $('rewardsSource').textContent='계정 조회 · '+(value.importedAt?new Date(value.importedAt).toLocaleString('ko-KR'):'시각 미상');$('rewardsResults').hidden=false;render();
 }catch(e){clear();$('rewardsMessage').textContent='보상 기록이 포함된 계정을 다시 가져와주세요. '+e.message;}
}
function clear(){account=null;rows=[];$('rewardsResults').hidden=true;$('rewardsOriginite').textContent='—';$('rewardsOrundum').textContent='—';$('rewardsSource').textContent='';$('rewardsMessage').textContent='계정을 가져오면 남은 일회성 보상을 자동으로 계산합니다.';}
function fromStorage(){try{const saved=JSON.parse(localStorage.getItem(REWARDS_KEY)||'null');if(saved)accept(saved);else clear();}catch{clear();}}
$('rewardsImport').onclick=()=>openAccountImport().catch(e=>{$('rewardsMessage').textContent=e.message;});
for(const id of ['rewardsSearch','rewardsCurrency','rewardsStatus'])$(id).addEventListener(id==='rewardsSearch'?'input':'change',render);
window.addEventListener('arknights-account-updated',fromStorage);window.addEventListener('storage',e=>{if(e.key===REWARDS_KEY)fromStorage();});
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent)return;if(e.data?.type==='preview-account')accept(e.data.account);if(e.data?.type==='preview-clear')clear();});
fromStorage();if(parent!==window)parent.postMessage({type:'preview-account-request'},location.origin);
setInterval(()=>{if(account)accept(account);},60000);
