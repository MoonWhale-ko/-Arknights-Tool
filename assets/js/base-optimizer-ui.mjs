import {offerShare} from './base-share-ui.mjs?v=2';
import {BASE_KEY,readBase} from './base-state.mjs?v=5';
import {DEFAULT_OPTIONS,normalizeOptions,prepareModel} from './base-optimizer.mjs?v=3';
const INTEGRATED_KEY=BASE_KEY+':integrated-options';
const KEY=BASE_KEY+':optimizer-options',PROGRESS_KEY='arknightsOperatorProgressV1';
const root=document.getElementById('baseOptimizer');
const $=id=>root.querySelector('#'+id),read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)??'null')??fallback;}catch{return fallback;}};
const categories={F_GOLD:'순금',F_EXP:'작전기록',F_DIAMOND:'오리지늄 조각'},names={MANUFACTURE:'제조소',TRADING:'무역소',POWER:'발전소',HIRE:'사무실',MEETING:'응접실',CONTROL:'제어센터',DORMITORY:'숙소'};
let worker=null,data=null,base=null,saved=normalizeOptions(read(KEY,DEFAULT_OPTIONS)),generation=0,lastIntegrated=null;
const text=(tag,value,className)=>{const el=document.createElement(tag);el.textContent=value;if(className)el.className=className;return el;};
function message(value,error=false){$('optimizerMessage').textContent=value;$('optimizerMessage').classList.toggle('error',error);}
function options(){return normalizeOptions({teams:Number($('optimizerTeams').value),rotation:$('optimizerRotation').value,extraActions:$('optimizerExtra').value==='yes',missingClues:[...root.querySelectorAll('[data-missing-clue]:checked')].map(input=>Number(input.value)),priority:[1,2,3].map(n=>$('optimizerPriority'+n).value),ambience:Object.fromEntries([...root.querySelectorAll('[data-ambience]')].map(input=>[input.dataset.ambience,input.value===''?null:Number(input.value)]))});}
function persist(){saved=options();try{if($('optimizerEngine'))localStorage.setItem(INTEGRATED_KEY,JSON.stringify({engine:$('optimizerEngine').value,seconds:Number($('optimizerSeconds').value),rankingWindow:$('optimizerWindow').value}));localStorage.setItem(KEY,JSON.stringify(saved));return true;}catch{message('설정을 저장하지 못했습니다. 현재 화면의 설정으로 계산합니다.',true);return false;}}
function resetResult(){lastIntegrated=null;if($('optimizerExport'))$('optimizerExport').hidden=true;if($('optimizerDownload'))$('optimizerDownload').hidden=true;generation++;if(worker){worker.terminate();worker=null;busy(false);}if(!$('optimizerResult').hidden){$('optimizerResult').hidden=true;message('조건이 변경되었습니다. 다시 계산해 주세요.');}}
function busy(value){$('optimizerRun').disabled=value;$('optimizerCancel').hidden=!value;root.setAttribute('aria-busy',String(value));}
function fillInputs(){
 try{base=readBase(read(BASE_KEY,null));}catch{base=null;message('저장된 기반시설 정보를 읽지 못했습니다. 계정을 다시 불러와 주세요.',true);return;}
 if($('optimizerEngine')){const integrated=read(INTEGRATED_KEY,{});$('optimizerEngine').value=integrated.engine==='legacy'?'legacy':'integrated';$('optimizerSeconds').value=String([10,30,60,180].includes(integrated.seconds)?integrated.seconds:10);$('optimizerWindow').value=integrated.rankingWindow==='cycle'?'cycle':'24h';}
 $('optimizerTeams').value=String(saved.teams);$('optimizerRotation').value=saved.rotation;$('optimizerExtra').value=saved.extraActions?'yes':'no';
 for(let n=1;n<=3;n++)$('optimizerPriority'+n).value=saved.priority[n-1];
 const clues=$('optimizerMissingClues');clues.replaceChildren();
 const clueNames=['라인 랩','펭귄 로지스틱스','블랙스틸','우르수스','글래스고','카란 무역회사','로도스'];
 for(let n=1;n<=7;n++){const label=text('label',`${n} · ${clueNames[n-1]}`);const input=document.createElement('input');input.type='checkbox';input.value=String(n);input.dataset.missingClue=String(n);input.checked=saved.missingClues.includes(n);label.prepend(input);clues.append(label);}
 const dorms=$('optimizerDorms');dorms.replaceChildren();let number=0;
 for(const [id,room] of Object.entries(base.rooms??{}))if(room.type==='DORMITORY'&&room.level>0){
  const label=text('label',`숙소 ${++number} · Lv.${room.level}`,'optimizer-field');const input=document.createElement('input');input.type='number';input.min='0';input.max=String(room.level*1000);input.step='1';input.required=true;input.dataset.ambience=id;input.setAttribute('aria-label',`숙소 ${number} 인테리어 점수`);
  const value=saved.ambience[id]??room.ambience;input.value=value===undefined||value===null?'':String(value);input.placeholder=`0~${room.level*1000}`;
  label.append(input);dorms.append(label);
 }
 if(!number)dorms.append(text('p','건설된 숙소가 없습니다.'));
 updateSettingsSummary(true);
}

function updateSettingsSummary(reveal=false){
 const inputs=[...root.querySelectorAll('[data-ambience]')],missing=inputs.filter(input=>input.value===''||!input.validity.valid);
 $('optimizerDormSummary').textContent=inputs.length?'숙소 인테리어 · '+(missing.length?missing.length+'개 입력 필요':inputs.length+'개 확인됨'):'숙소 인테리어 · 건설된 숙소 없음';
 $('optimizerDormNotice').hidden=!missing.length;
 $('optimizerDormNotice').textContent=missing.length?'숙소 인테리어 점수 '+missing.length+'개를 입력해야 계산할 수 있습니다.':'';
 if(reveal&&missing.length){$('optimizerAdvanced').open=true;$('optimizerDormSettings').open=true;}
 const clues=root.querySelectorAll('[data-missing-clue]:checked').length;
 $('optimizerClueSummary').textContent=clues?clues+'종 선택':'선택 안 함';
 const seconds=Number($('optimizerSeconds').value);
 $('optimizerAdvancedNote').textContent=($('optimizerWindow').value==='cycle'?'첫 사이클':'24시간')+' · '+(seconds>=60?seconds/60+'분':seconds+'초')+' 계산';
 return missing;
}
function renderRotationSummary(target,stages){
 if(!stages.length)return;
 const section=text('section','','optimizer-rotation-summary');
 section.setAttribute('aria-label','근무조와 교대 시점');
 const first=stages[0],next=stages[1];
 if(Number.isFinite(first.end))section.append(text('p','첫 교대 · 시작 후 '+duration(first.end)+(next?' · '+(first.team+1)+'조 → '+(next.team+1)+'조':''),'optimizer-next-shift'));
 const list=text('ol','','optimizer-shift-cards');
 for(let index=0;index<stages.length;index++){
  const stage=stages[index],card=text('li','','optimizer-shift-card');
  card.append(text('strong',(stage.team+1)+'조'));
  const known=Number.isFinite(stage.start)&&Number.isFinite(stage.end);
  card.append(text('span',known?duration(stage.end-stage.start)+' 근무':'근무 시간 확인 필요'));
  card.append(text('small',known?'시작 후 '+duration(stage.start)+' → '+duration(stage.end):'상세 기록을 확인하세요.'));
  list.append(card);
 }
 section.append(list);target.append(section);
}

function duration(hours){const minutes=Math.round(hours*60);return `${Math.floor(minutes/60)}시간 ${minutes%60}분`;}
function chip(op,resident=false,morale){
 const element=document.createElement('span');element.className='optimizer-chip';const img=document.createElement('img');img.alt='';img.loading='lazy';img.src=`https://raw.githubusercontent.com/ArknightsAssets/ArknightsAssets2/cn/assets/dyn/arts/charavatars/${op.id}.png`;img.addEventListener('error',()=>img.remove(),{once:true});element.append(img,text('span',op.name));if(resident)element.append(text('small','상주'));if(morale!==undefined)element.title=`종료 컨디션 ${morale.toFixed(1)} / 24`;return element;
}
function renderResult(result){
 const target=$('optimizerResult');target.replaceChildren();target.hidden=false;
 if(result.status!=='recommended'){target.append(text('p',result.reason));renderWarnings(target,result.warnings);return;}
 const representatives=result.stages.slice(-options().teams),offset=representatives[0]?.start??0;
 target.append(text('h3','추천 배치'));
 renderRotationSummary(target,representatives.map(stage=>({team:stage.team,start:stage.start-offset,end:stage.end-offset})));
 renderWarnings(target,result.warnings);
 const wrap=text('div','','optimizer-table-wrap'),table=document.createElement('table'),head=document.createElement('thead'),hr=document.createElement('tr');hr.append(text('th','시설'));
 for(const stage of representatives)hr.append(text('th',(stage.team+1)+'조'));head.append(hr);table.append(head);const body=document.createElement('tbody');
 const roomOrder=representatives[0]?.rooms??[],counts={},roomNames={};
 for(const room of roomOrder){
  counts[room.type]=(counts[room.type]??0)+1;roomNames[room.id]=names[room.type]+(['MANUFACTURE','TRADING','POWER','DORMITORY'].includes(room.type)?' '+counts[room.type]:'');
  if(room.type==='DORMITORY')continue;
  const row=document.createElement('tr');row.append(text('th',roomNames[room.id]));
  for(const stage of representatives){const cell=document.createElement('td'),list=text('div','','optimizer-room-ops');const entry=stage.rooms.find(r=>r.id===room.id);for(const index of entry?.operators??[])list.append(chip(result.pool[index],result.plan.residents.includes(index),stage.endMorale[index]));if(!list.children.length)list.textContent='배치 없음';cell.append(list);row.append(cell);}body.append(row);
 }
 table.append(body);wrap.append(table);target.append(wrap);
 const dorms=roomOrder.filter(room=>room.type==='DORMITORY');
 if(dorms.length){target.append(text('h3','숙소 · 고정 지원자'));for(const room of dorms){const row=text('div','','optimizer-room-ops');row.append(text('strong',roomNames[room.id]));for(const index of room.operators.filter(i=>result.plan.support.includes(i)))row.append(chip(result.pool[index]));if(row.children.length===1)row.append(text('span','고정 지원자 없음'));target.append(row);}}
 target.append(text('h3','예상 생산 효율'));
 const summary=text('div','','optimizer-summary');
 if(result.plan.rooms.some(r=>r.type==='HIRE'))summary.append(text('span','사무실 · 기본 대비 '+(result.score[0]*100).toFixed(1)+'%'));
 if(result.plan.rooms.some(r=>r.type==='MEETING'))summary.append(text('span','응접실 · 기본 대비 '+(result.score[2]*100).toFixed(1)+'%'));
 for(const [i,key] of options().priority.entries())summary.append(text('span',categories[key]+' · '+result.score[i+3].toFixed(2)+(key==='F_EXP'?' 경험치':'개')+'/시간'));target.append(summary);
 const timeline=document.createElement('details');timeline.append(text('summary','교대·컨디션 상세 기록'));const list=text('div','','optimizer-timeline');
 for(const stage of representatives){
  list.append(text('p',duration(stage.start-offset)+' → '+duration(stage.end-offset)+': '+(stage.team+1)+'조 근무'+(stage.blocked.length?' · '+stage.blocked.length+'개 제조소 보관 한도 도달':'')));
  for(const r of stage.rooms.filter(r=>r.type!=='DORMITORY'))for(const i of r.operators)list.append(text('div',result.pool[i].name+': '+stage.startMorale[i].toFixed(1)+' → '+stage.endMorale[i].toFixed(1)));
 }
 timeline.append(list);
 if(result.actions.some(a=>a.type==='exchange')){const actions=text('div','','optimizer-timeline');for(const a of result.actions.filter(a=>a.hour>=offset&&a.type==='exchange'))actions.append(text('p',duration(a.hour-offset)+': '+result.pool[a.target].name+' 입실 → '+result.pool[a.provider].name+' 재배치, 컨디션 교환'));timeline.append(actions);}
 target.append(timeline);
 const diagnostics=document.createElement('details');diagnostics.append(text('summary','계산 상세'),text('p','후보 '+result.tested.toLocaleString()+'개 비교 · 10순환 시뮬레이션 · '+(result.converged?'반복 상태 확인':'반복 상태 미확인')),text('p','탐색 범위 내 추천이며, 전체 최적해를 보장하지 않습니다. 미지원 효과가 있는 인원은 해당 시설 후보에서 제외했습니다.','optimizer-note'),text('p','미보유 단서 우선 효과는 스킬 가동 시간으로 비교하며 실제 획득 확률·종류·시각은 보장하지 않습니다.','optimizer-note'));target.append(diagnostics);
}
function renderWarnings(target,warnings=[]){if(!warnings.length)return;const details=document.createElement('details');details.append(text('summary',`미지원·누락 데이터 확인 (${warnings.length}건)`));const list=text('ul','','optimizer-warnings');for(const warning of warnings){const li=text('li',`${warning.operator} · ${names[warning.room]??''} ${warning.skill??''}: ${warning.reason}`);if(warning.description)li.title=warning.description;list.append(li);}details.append(list);target.append(details);}
root.addEventListener('change',event=>{
 if(event.target.matches('[data-priority]')){const n=Number(event.target.dataset.priority)-1,values=[...saved.priority],newValue=event.target.value,other=values.indexOf(newValue);if(other!==n&&other>=0)$('optimizerPriority'+(other+1)).value=values[n];}
 resetResult();persist();updateSettingsSummary();
});
$('optimizerRun').addEventListener('click',async()=>{
 const missing=updateSettingsSummary(true);if(missing.length){message('숙소 인테리어 점수를 확인해 주세요.',true);missing[0].reportValidity();missing[0].focus();return;}
 resetResult();persist();const token=generation;busy(true);message('스킬 데이터와 입력을 확인하고 있습니다.');
 try{
  if(!data){const response=await fetch('data/base-optimizer.json?v=3');if(!response.ok)throw Error('기반시설 스킬 데이터를 불러오지 못했습니다.');data=await response.json();}
  if(token!==generation)return;
  base=readBase(read(BASE_KEY,null));const progress=read(PROGRESS_KEY,{}),products=read(BASE_KEY+':manufacture-products',{}),config=options();
  if($('optimizerEngine')?.value==='integrated'){
   const {prepareIntegratedInput}=await import('./base-integrated-adapter.mjs?v=1');if(token!==generation)return;
   const prepared=prepareIntegratedInput(data,base,progress,products,{...config,rankingWindow:$('optimizerWindow').value},read(BASE_KEY+':trading-products',{}));
   worker=new Worker(new URL('./base-integrated-worker.mjs?v=1',import.meta.url),{type:'module'});
   worker.onmessage=({data:event})=>{
    if(token!==generation)return;
    if(event.type==='started'){message(`보유 ${event.owned}명 · 배치 탐색 중…`);return;}
    if(event.type==='progress'){message('배치를 비교하고 있습니다…');return;}
    busy(false);worker?.terminate();worker=null;
    if(event.type==='error')message(event.message,true);else{lastIntegrated=event.result;renderIntegrated(event.result);$('optimizerDownload').hidden=!event.result.best;$('optimizerExport').hidden=!event.result.best;message('계산 완료 · 아래 추천 배치를 확인하세요.');}
   };
   worker.onerror=event=>{if(token!==generation)return;busy(false);worker?.terminate();worker=null;message(event.message||'계산 도중 오류가 발생했습니다. 다시 시도해 주세요.',true);};
   worker.postMessage({catalog:data,input:prepared.input,warnings:prepared.warnings,seconds:Number($('optimizerSeconds').value)});return;
  }
  const model=prepareModel(data,base,progress,products,config);if(model.missing.length)throw Error(model.missing.join('\n'));
  worker=new Worker(new URL('./base-optimizer-worker.mjs?v=3',import.meta.url),{type:'module'});
  worker.onmessage=event=>{
   if(token!==generation)return;
   if(event.data.type==='progress')message('배치를 비교하고 있습니다…');
   else{busy(false);worker?.terminate();worker=null;if(event.data.type==='error')message(event.data.message,true);else{message('계산을 완료했습니다. 추천 결과와 지원 범위를 확인해 주세요.');renderResult(event.data.result);const sharing=document.createElement('details');sharing.append(text('summary','결과 공유'));offerShare(sharing,{data,base,progress,products,options:config},event.data.result);$('optimizerResult').append(sharing);}}
  };
  worker.onerror=()=>{if(token!==generation)return;busy(false);worker?.terminate();worker=null;message('계산 도중 오류가 발생했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.',true);};
  worker.postMessage({data,base,progress,products,options:config});
 }catch(error){if(token!==generation)return;busy(false);message(error.message,true);}
});
$('optimizerCancel').addEventListener('click',()=>{generation++;worker?.terminate();worker=null;busy(false);message('계산을 취소했습니다.');});
window.addEventListener('storage',event=>{if([BASE_KEY,PROGRESS_KEY,BASE_KEY+':manufacture-products',BASE_KEY+':trading-products',KEY,INTEGRATED_KEY,null].includes(event.key)){resetResult();if(event.key===KEY)saved=normalizeOptions(read(KEY,{}));fillInputs();message('저장된 정보가 변경되었습니다. 다시 계산해 주세요.');}});
window.addEventListener('pageshow',()=>{resetResult();fillInputs();});
window.addEventListener('base-products-changed',()=>{resetResult();message('생산 품목이 변경되었습니다. 다시 계산해 주세요.');});
fillInputs();

window.addEventListener('account-import-applied',()=>{resetResult();fillInputs();message('계정 정보가 갱신되었습니다. 생산 품목을 확인한 뒤 계산해 주세요.');});

function renderIntegrated(report){
 const target=$('optimizerResult');target.replaceChildren();target.hidden=false;
 const number=value=>value==null?'—':Number(value).toLocaleString('ko-KR',{maximumFractionDigits:2});
 const efficiency=(point,key)=>point?.hour>0&&Number.isFinite(point[key])?number(point[key]/point.hour*100)+'%':'—';
 const best=report.best,details=document.createElement('details');details.className='optimizer-result-details';
 const warnings=[...(report.warnings??[]),...(report.errors??[])];
 details.append(text('summary','계산 상세·지원 범위'+(warnings.length?' · '+warnings.length+'건':'')));
 if(!best){target.append(text('p','현재 조건에서 비교 가능한 배치를 찾지 못했습니다. 입력 설정이나 계산 시간을 확인해 주세요.'));for(const error of report.errors??[])target.append(text('p',error,'optimizer-result-notice'));}
 else{
  target.append(text('h3','추천 배치'));
  const events=best.events??[],shifts=events.filter(e=>e.type==='shift'),firstShifts=[];
  for(let team=0;team<report.input.options.teams;team++){const shift=shifts.find(s=>s.team===team),index=shifts.indexOf(shift);if(shift)firstShifts.push({team,start:shift.hour,end:shifts[index+1]?.hour??best.cycle?.hour});}
  renderRotationSummary(target,firstShifts);
  target.append(text('p','첫 근무는 전원 컨디션 24에서 시작합니다.','optimizer-note'));
  if(warnings.length){const notice=text('button','제외·확인 항목 '+warnings.length+'건 보기','optimizer-result-notice');notice.type='button';notice.addEventListener('click',()=>{details.open=true;details.scrollIntoView({block:'nearest'});});target.append(notice);}
  if(best.reason)target.append(text('p',best.reason,'optimizer-result-notice'));
  const roomNames={},counts={};
  for(const r of report.rooms){counts[r.type]=(counts[r.type]??0)+1;roomNames[r.id]=(names[r.type]??({TRAINING:'훈련실',WORKSHOP:'가공소'}[r.type])??r.type)+(['MANUFACTURE','TRADING','POWER','DORMITORY'].includes(r.type)?' '+counts[r.type]:'')+' · Lv.'+r.level;}
  for(let team=0;team<report.input.options.teams;team++){
   const shift=shifts.find(s=>s.team===team);target.append(text('h3',(team+1)+'조'));
   const rows=shift?.rooms??best.plan.groups.filter(g=>g.team===team).map(g=>({id:g.room,operators:g.operators}));
   for(const r of rows.filter(r=>report.rooms.find(room=>room.id===r.id)?.type!=='DORMITORY')){
    const row=text('div','','optimizer-room-ops');row.append(text('strong',roomNames[r.id]??r.id));
    for(const id of r.operators)row.append(chip(report.operators[id]??{id,name:id},report.input.residents.some(p=>p.id===id),best.cycle?.morale?.[id]??best.at24?.morale?.[id]));
    if(!r.operators.length)row.append(text('span','배치 없음'));target.append(row);
   }
  }
  const dormRooms=report.rooms.filter(r=>r.type==='DORMITORY');
  if(dormRooms.length){
   target.append(text('h3','숙소 · 고정 지원자'),text('p','교대 없이 같은 숙소에 유지할 인원입니다.','optimizer-note'));
   for(const room of dormRooms){const row=text('div','','optimizer-room-ops');row.append(text('strong',roomNames[room.id]));const ids=(best.plan.dormSupport??report.input.dormSupport??{})[room.id]??[];for(const id of ids){const badge=chip(report.operators[id]??{id,name:id});badge.append(text('small','고정'));row.append(badge);}if(!ids.length)row.append(text('span','고정 지원자 없음'));target.append(row);}
  }
  const a=best.at24,b=best.cycle,range=p=>p?.trade?.range?.generatedLmd?.map(number).join(' ~ ')??'—';
  const cycle=report.input.options.rankingWindow==='cycle',point=cycle?b:a;
  target.append(text('h3','예상 생산량 · '+(cycle?'첫 사이클':'24시간')));
  const summary=text('div','','optimizer-summary optimizer-output-summary');
  if(point){
   for(const [key,name] of Object.entries(categories))if(point.produced?.[key]>0)summary.append(text('span',name+' · '+number(point.produced[key])+(key==='F_EXP'?' 경험치':'개')));
   if(report.rooms.some(r=>r.type==='HIRE'))summary.append(text('span','사무실 효율 · 기본 대비 '+efficiency(point,'officeEquivalentHours')));
   if(report.rooms.some(r=>r.type==='MEETING'))summary.append(text('span','응접실 효율 · 기본 대비 '+efficiency(point,'meetingEquivalentHours')));
   if(range(point)!=='—')summary.append(text('span','용문폐 기대 수익 · '+range(point)));
  }
  if(!summary.children.length)summary.append(text('span',point?'완료된 생산 없음':'선택한 계산 구간 미완료'));target.append(summary);
  const timeline=document.createElement('details');timeline.append(text('summary','교대·컨디션 상세 기록'));const list=text('ol','','optimizer-event-list');
  for(const e of events.filter(e=>['shift','exchange'].includes(e.type))){const item=document.createElement('li');item.append(text('strong','시작 후 '+duration(e.hour)+' · '+(e.type==='shift'?(e.team+1)+'조 근무 시작':'컨디션 교환')));if(e.rooms){const rooms=document.createElement('ul');for(const r of e.rooms.filter(r=>report.rooms.find(room=>room.id===r.id)?.type!=='DORMITORY'))rooms.append(text('li',(roomNames[r.id]??r.id)+': '+(r.operators.map(id=>report.operators[id]?.name??id).join(', ')||'배치 없음')));item.append(rooms);}list.append(item);}
  timeline.append(list);target.append(timeline);
  details.append(text('p','후보 '+(report.stats?.simulations??0).toLocaleString()+'개 비교 · 탐색 '+((report.elapsedMs??0)/1000).toFixed(1)+'초'),text('p','탐색 범위 내 추천이며 전체 최적해를 보장하지 않습니다. 첫 사이클은 모든 근무조가 한 번씩 근무를 마칠 때까지입니다.','optimizer-note'));
  const wrap=text('div','','optimizer-table-wrap'),table=document.createElement('table'),head=document.createElement('tr');for(const title of ['지표','24시간','첫 사이클'])head.append(text('th',title));table.append(head);
  for(const [label,left,right] of [['완료 시각',a?duration(a.hour):'미완료',b?duration(b.hour):'검사 범위 내 미완료'],...Object.entries(categories).map(([key,name])=>[name+' ('+(key==='F_EXP'?'경험치':'개')+')',number(a?.produced?.[key]),number(b?.produced?.[key])]),['사무실 효율 · 기본 대비',efficiency(a,'officeEquivalentHours'),efficiency(b,'officeEquivalentHours')],['응접실 효율 · 기본 대비',efficiency(a,'meetingEquivalentHours'),efficiency(b,'meetingEquivalentHours')],['용문폐 기대 수익',range(a),range(b)]]){const row=document.createElement('tr');row.append(text('th',label),text('td',left),text('td',right));table.append(row);}wrap.append(table);details.append(wrap);
 }
 for(const warning of warnings)details.append(text('p',warning));
 for(const assumption of best?.at24?.trade?.assumptions??[])if(assumption==='unobserved-quality-distribution')details.append(text('p','관측 자료가 없는 고품질 주문 조합은 기본 확률 분포를 적용했습니다.'));
 target.append(details);
}
$('optimizerDownload')?.addEventListener('click',()=>{
 if(!lastIntegrated?.best)return;const url=URL.createObjectURL(new Blob([JSON.stringify(lastIntegrated,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='arknights-base-recommendation.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});

document.getElementById('tradingDialog')?.addEventListener('close',()=>{resetResult();message('거래 방식 설정을 확인했습니다. 다시 계산해 주세요.');});
