import { audit, totals, accountUser } from './engine.mjs';
const $ = id => document.getElementById(id);
const labels = {remaining:'미수령',unknown:'확인 필요',claimed:'수령 완료'};
let catalog, data, rows=[], excluded=[], overrides={}, demo=false;
const el = (tag,text,cls) => { const n=document.createElement(tag); if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n; };
async function load() { if(!catalog) {const r=await fetch('/mining/catalog.json');if(!r.ok)throw new Error('스테이지 기준 데이터를 불러오지 못했습니다.');catalog=await r.json();} }
function message(text) {$('mineMessage').textContent=text;}
function render() {
  if(!data)return;
  const result=audit(catalog,data,{overrides});rows=result.included;excluded=result.excluded;
  const progressBox=$('mineSimulation');progressBox.replaceChildren();
  for(const g of result.simulation){const n=el('p',g.id.replace('main_','')+'지역 · '+(g.point??'?')+'P · 추가 별 합계 '+(g.derived??'확인 필요')+(g.mismatch?' · 기록 불일치: 계정 누적 포인트로 판정':''));progressBox.append(n);}
  const total=totals(rows);
  $('mineResult').hidden=false;
  $('mineRemaining').textContent=total.remaining.toLocaleString();
  $('mineUnknown').textContent=rows.filter(s=>s.assumed).reduce((n,s)=>n+s.op,0).toLocaleString();
  $('mineClaimed').textContent=total.claimed.toLocaleString();
  $('mineSource').textContent=(demo?'예시 계정 · 실제 계정 결과가 아닙니다':'실제 계정 · '+(data.importedAt?new Date(data.importedAt).toLocaleString('ko-KR'):'JSON 가져오기'))+' · 계산 '+new Date(result.calculatedAt).toLocaleString('ko-KR');
  const category=$('mineCategory').value, status=$('mineStatus').value, query=$('mineSearch').value.trim().toLowerCase();
  const filtered=rows.filter(s=>(!category||s.category===category)&&(!status||s.status===status)&&(!query||[s.code,s.name,s.group,s.mode,s.id].join(' ').toLowerCase().includes(query)));
  const groups=new Map(); for(const s of filtered){const key=s.category+'|'+s.group;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(s);}
  const box=$('mineGroups'), opened=new Set([...box.querySelectorAll('details[open]')].map(n=>n.dataset.key));box.replaceChildren();
  $('mineCount').textContent=`검색 결과 ${filtered.length}항목 · 미수령 ${totals(filtered).remaining}개`;
  for(const stages of groups.values()) {
    const sum=totals(stages), detail=el('details',undefined,'mine-group'), summary=el('summary');detail.dataset.key=stages[0].category+'|'+stages[0].group;detail.open=opened.has(detail.dataset.key);
    summary.append(el('b',stages[0].group),el('span',`미수령 ${sum.remaining} · 확인 필요 ${sum.unknown} · 완료 ${sum.claimed}`));detail.append(summary);
    const list=el('div',undefined,'mine-stages');
    for(const stage of stages) {
      const row=el('div',undefined,'mine-stage'),title=el('div'); title.append(el('strong',stage.code+' · '+stage.mode),el('small',stage.name+' · '+(stage.kind||'전투')+' · '+stage.availability+' · '+stage.access));
      const badge=el('span',labels[stage.status],'mine-status '+stage.status);badge.title=stage.reason;
      const select=el('select');select.setAttribute('aria-label',stage.code+' '+stage.mode+' 수령 여부');
      for(const [value,text]of [['','계정 판정'],['remaining','미수령으로 확인'],['claimed','수령 완료로 확인']]){const opt=el('option',text);opt.value=value;select.append(opt);}select.value=overrides[stage.id]||'';
      select.onchange=()=>{if(select.value)overrides[stage.id]=select.value;else delete overrides[stage.id];render();};
      const info=el('small',stage.reason,'mine-reason');row.append(title,badge,el('b',`◆ ${stage.op}`),select,info);list.append(row);
    }
    detail.append(list);box.append(detail);
  }
  const excludedBox=$('mineExcludedGroups');excludedBox.replaceChildren();
  const excludedGroups=new Map();
  const excludedFiltered=excluded.filter(s=>(!category||s.category===category)&&(!query||[s.code,s.name,s.group,s.mode,s.exclusion].join(' ').toLowerCase().includes(query)));
  for(const s of excludedFiltered){const key=s.exclusion+'|'+s.group;if(!excludedGroups.has(key))excludedGroups.set(key,[]);excludedGroups.get(key).push(s);}
  $('mineExcludedCount').textContent=`계산에서 제외된 항목 · ${excludedFiltered.length}개`;
  for(const list of excludedGroups.values()){
    const first=list[0],detail=el('details',undefined,'mine-group'),head=el('summary');
    head.append(el('b',first.group),el('span',first.exclusion+' · '+list.length+'개'));detail.append(head);
    const body=el('div',undefined,'mine-excluded-body');body.append(el('p',first.opensAt?'개방 예정: '+new Date(first.opensAt*1000).toLocaleString('ko-KR'):first.detail));
    if(first.source){const link=el('a','일정 참고 자료 ↗');link.href=first.source;link.target='_blank';link.rel='noopener noreferrer';body.append(link);}
    body.append(el('p',list.map(s=>s.code+' ('+s.mode+')').join(', ')));detail.append(body);excludedBox.append(detail);
  }
  if(!groups.size)box.append(el('p','조건에 맞는 스테이지가 없습니다.','empty'));
  message(demo?'예시 데이터를 표시 중입니다. 실제 결과는 계정 가져오기 또는 JSON 파일로 확인하세요.':'초회·누적 보상을 계산했습니다. 선행 조건과 난이도 연동을 우선 확인하고, 근거가 없는 누락 기록만 미완료로 간주합니다.');
}
async function accept(value,isDemo=false){await load();accountUser(value);data=value;demo=isDemo;overrides={};render();}
$('mineFile').onchange=async event=>{try{const file=event.target.files[0];if(!file)return;if(file.size>30*1024*1024)throw new Error('30MB 이하의 계정 JSON을 선택하세요.');await accept(JSON.parse(await file.text()));}catch(e){message(e.message);}finally{event.target.value='';}};
$('mineUseAccount').onclick=()=>window.dispatchEvent(new Event('mining-request-account'));
window.addEventListener('mining-account',e=>{if(e.detail)accept(e.detail).catch(e=>message(e.message));else message('계정 원본 데이터 탭에서 먼저 계정을 가져오세요. 또는 내려받은 JSON을 선택하세요.');});
window.addEventListener('mining-clear',()=>{data=null;rows=[];excluded=[];overrides={};$('mineResult').hidden=true;message('계정 데이터를 지웠습니다.');});
$('mineDemo').onclick=async()=>{try{await load();const active=catalog.stages.filter(s=>s.category==='main'&&s.mode==='일반').slice(0,30);const stages=Object.fromEntries(active.map((s,i)=>[s.id,{state:i<20?3:i%3,completeTimes:i<20?1:0}]));await accept({user:{dungeon:{stages}}},true);}catch(e){message(e.message);}};
$('mineReset').onclick=()=>{overrides={};render();};
for(const id of ['mineCategory','mineStatus','mineSearch'])$(id).addEventListener(id==='mineSearch'?'input':'change',render);
$('mineExport').onclick=()=>{if(!data)return;const blob=new Blob([JSON.stringify({version:1,demo,calculatedAt:new Date().toISOString(),catalogRevision:catalog.revision,totals:totals(rows),stages:rows.map(({id,code,group,mode,op,status,reason,access,kind})=>({id,code,group,mode,op,status,reason,access,kind})),excluded:excluded.map(({id,code,group,mode,exclusion,detail})=>({id,code,group,mode,exclusion,detail}))},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='zoot-originite-rewards.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};

$('mineClear').onclick=()=>window.dispatchEvent(new Event('mining-clear'));

setInterval(()=>{if(data)render();},60000);
