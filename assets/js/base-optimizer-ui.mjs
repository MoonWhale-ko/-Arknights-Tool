import {offerShare} from './base-share-ui.mjs';
import {BASE_KEY,readBase} from './base-state.mjs?v=5';
import {DEFAULT_OPTIONS,normalizeOptions,prepareModel} from './base-optimizer.mjs?v=2';
const KEY=BASE_KEY+':optimizer-options',PROGRESS_KEY='arknightsOperatorProgressV1';
const root=document.getElementById('baseOptimizer');
const $=id=>root.querySelector('#'+id),read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)??'null')??fallback;}catch{return fallback;}};
const categories={F_GOLD:'순금',F_EXP:'작전기록',F_DIAMOND:'오리지늄 조각'},names={MANUFACTURE:'제조소',TRADING:'무역소',POWER:'발전소',HIRE:'사무실',CONTROL:'제어센터',DORMITORY:'숙소'};
let worker=null,data=null,base=null,saved=normalizeOptions(read(KEY,DEFAULT_OPTIONS)),generation=0;
const text=(tag,value,className)=>{const el=document.createElement(tag);el.textContent=value;if(className)el.className=className;return el;};
function message(value,error=false){$('optimizerMessage').textContent=value;$('optimizerMessage').classList.toggle('error',error);}
function options(){return normalizeOptions({teams:Number($('optimizerTeams').value),rotation:$('optimizerRotation').value,extraActions:$('optimizerExtra').value==='yes',priority:[1,2,3].map(n=>$('optimizerPriority'+n).value),ambience:Object.fromEntries([...root.querySelectorAll('[data-ambience]')].map(input=>[input.dataset.ambience,input.value===''?null:Number(input.value)]))});}
function persist(){saved=options();try{localStorage.setItem(KEY,JSON.stringify(saved));return true;}catch{message('설정을 저장하지 못했습니다. 현재 화면의 설정으로 계산합니다.',true);return false;}}
function resetResult(){generation++;if(worker){worker.terminate();worker=null;busy(false);}if(!$('optimizerResult').hidden){$('optimizerResult').hidden=true;message('조건이 변경되었습니다. 다시 계산해 주세요.');}}
function busy(value){$('optimizerRun').disabled=value;$('optimizerCancel').hidden=!value;root.setAttribute('aria-busy',String(value));}
function fillInputs(){
 try{base=readBase(read(BASE_KEY,null));}catch{base=null;message('저장된 기반시설 정보를 읽지 못했습니다. 계정을 다시 불러와 주세요.',true);return;}
 $('optimizerTeams').value=String(saved.teams);$('optimizerRotation').value=saved.rotation;$('optimizerExtra').value=saved.extraActions?'yes':'no';
 for(let n=1;n<=3;n++)$('optimizerPriority'+n).value=saved.priority[n-1];
 const dorms=$('optimizerDorms');dorms.replaceChildren();let number=0;
 for(const [id,room] of Object.entries(base.rooms??{}))if(room.type==='DORMITORY'&&room.level>0){
  const label=text('label',`숙소 ${++number} · Lv.${room.level}`,'optimizer-field');const input=document.createElement('input');input.type='number';input.min='0';input.max=String(room.level*1000);input.step='1';input.dataset.ambience=id;input.setAttribute('aria-label',`숙소 ${number} 인테리어 점수`);
  const value=saved.ambience[id]??room.ambience;input.value=value===undefined||value===null?'':String(value);input.placeholder=`0~${room.level*1000}`;
  label.append(input,text('span',room.ambience===undefined?'계정에 점수가 없으면 직접 입력':'불러온 점수 · 직접 수정 가능','optimizer-dorm-hint'));dorms.append(label);
 }
 if(!number)dorms.append(text('p','건설된 숙소가 없습니다. 휴식조의 숙소 회복 없이 계산합니다.'));
}
function duration(hours){const minutes=Math.round(hours*60);return `${Math.floor(minutes/60)}시간 ${minutes%60}분`;}
function chip(op,resident=false,morale){
 const element=document.createElement('span');element.className='optimizer-chip';const img=document.createElement('img');img.alt='';img.loading='lazy';img.src=`https://raw.githubusercontent.com/ArknightsAssets/ArknightsAssets2/cn/assets/dyn/arts/charavatars/${op.id}.png`;img.addEventListener('error',()=>img.remove(),{once:true});element.append(img,text('span',op.name));if(resident)element.append(text('small','상주'));if(morale!==undefined)element.title=`종료 컨디션 ${morale.toFixed(1)} / 24`;return element;
}
function renderResult(result){
 const target=$('optimizerResult');target.replaceChildren();target.hidden=false;
 if(result.status!=='recommended'){target.append(text('p',result.reason));renderWarnings(target,result.warnings);return;}
 const summary=text('div','','optimizer-summary');summary.append(text('span',`최우선 사무실: ${result.plan.rooms.some(r=>r.type==='HIRE')?(result.score[0]*100).toFixed(2)+'% (기본 속도 대비)':'미건설'}`));for(const [i,key] of options().priority.entries())summary.append(text('span',`${i+1}순위 ${categories[key]}: ${result.score[i+1].toFixed(2)} ${key==='F_EXP'?'경험치':'개'}/시간`));target.append(summary);
 target.append(text('p',`후보 ${result.tested.toLocaleString()}개 비교 · 10순환 시뮬레이션 · ${result.converged?'최근 컨디션 상태 반복 확인':'반복 상태 미확인'} · 탐색 범위 내 추천`));
 target.append(text('p','전체 조합의 최고 효율을 보장하지 않습니다. 미지원 효과가 있는 인원은 해당 시설의 후보에서 제외했습니다.','optimizer-note'));
 const representatives=result.stages.slice(-options().teams),wrap=text('div','','optimizer-table-wrap'),table=document.createElement('table');const head=document.createElement('thead'),hr=document.createElement('tr');hr.append(text('th','시설'));
 for(const stage of representatives)hr.append(text('th',`${stage.team+1}조 · ${duration(stage.hours)}`));head.append(hr);table.append(head);const body=document.createElement('tbody');
 const roomOrder=representatives[0]?.rooms??[],counts={};for(const room of roomOrder){
  counts[room.type]=(counts[room.type]??0)+1;const row=document.createElement('tr');row.append(text('th',names[room.type]+(['MANUFACTURE','TRADING','POWER','DORMITORY'].includes(room.type)?` ${counts[room.type]}`:'')));
  for(const stage of representatives){const cell=document.createElement('td'),list=text('div','','optimizer-room-ops');const entry=stage.rooms.find(r=>r.id===room.id);for(const index of entry?.operators??[])list.append(chip(result.pool[index],result.plan.residents.includes(index),stage.endMorale[index]));if(!list.children.length)list.textContent='배치 없음';cell.append(list);row.append(cell);}body.append(row);
 }
 table.append(body);wrap.append(table);target.append(wrap);
 const timeline=document.createElement('details');timeline.append(text('summary','교대 시간표와 컨디션 보기'));const list=text('div','','optimizer-timeline');
 const offset=representatives[0]?.start??0;for(const stage of representatives){
  list.append(text('p',`${duration(stage.start-offset)} → ${duration(stage.end-offset)}: ${stage.team+1}조 근무${stage.blocked.length?` · ${stage.blocked.length}개 제조소 보관 한도 도달`:''}`));
  for(const r of stage.rooms.filter(r=>r.type!=='DORMITORY'))for(const i of r.operators)list.append(text('div',`${result.pool[i].name}: ${stage.startMorale[i].toFixed(1)} → ${stage.endMorale[i].toFixed(1)}`));
 }
 timeline.append(list);target.append(timeline);
 if(result.actions.length){const detail=document.createElement('details');detail.append(text('summary',`숙소 조작 안내 (${result.actions.filter(a=>a.hour>=offset).length}건)`));const actions=text('div','','optimizer-timeline');for(const a of result.actions.filter(a=>a.hour>=offset)){
  if(a.type==='exchange')actions.append(text('p',`${duration(a.hour-offset)}: ${result.pool[a.target].name} 입실 → ${result.pool[a.provider].name} 재배치, 컨디션 교환`));
  else for(const r of a.rooms){const dorms=representatives[0].rooms.filter(room=>room.type==='DORMITORY');actions.append(text('p',`${duration(a.hour-offset)} · 숙소 ${dorms.findIndex(room=>room.id===r.id)+1}: ${r.operators.map(i=>result.pool[i].name).join(', ')}`));}
 }detail.append(actions);target.append(detail);}
 renderWarnings(target,result.warnings);
}
function renderWarnings(target,warnings=[]){if(!warnings.length)return;const details=document.createElement('details');details.append(text('summary',`미지원·누락 데이터 확인 (${warnings.length}건)`));const list=text('ul','','optimizer-warnings');for(const warning of warnings){const li=text('li',`${warning.operator} · ${names[warning.room]??''} ${warning.skill??''}: ${warning.reason}`);if(warning.description)li.title=warning.description;list.append(li);}details.append(list);target.append(details);}
root.addEventListener('change',event=>{
 if(event.target.matches('[data-priority]')){const n=Number(event.target.dataset.priority)-1,values=[...saved.priority],newValue=event.target.value,other=values.indexOf(newValue);if(other!==n&&other>=0)$('optimizerPriority'+(other+1)).value=values[n];}
 resetResult();persist();
});
$('optimizerRun').addEventListener('click',async()=>{
 resetResult();persist();const token=generation;busy(true);message('스킬 데이터와 입력을 확인하고 있습니다.');
 try{
  if(!data){const response=await fetch('data/base-optimizer.json?v=2');if(!response.ok)throw Error('기반시설 스킬 데이터를 불러오지 못했습니다.');data=await response.json();}
  if(token!==generation)return;
  base=readBase(read(BASE_KEY,null));const progress=read(PROGRESS_KEY,{}),products=read(BASE_KEY+':manufacture-products',{}),config=options();
  const model=prepareModel(data,base,progress,products,config);if(model.missing.length)throw Error(model.missing.join('\n'));
  worker=new Worker(new URL('./base-optimizer-worker.mjs?v=2',import.meta.url),{type:'module'});
  worker.onmessage=event=>{
   if(token!==generation)return;
   if(event.data.type==='progress')message(`후보 ${event.data.progress.tested.toLocaleString()}개 비교 중…`);
   else{busy(false);worker?.terminate();worker=null;if(event.data.type==='error')message(event.data.message,true);else{message('계산을 완료했습니다. 추천 결과와 지원 범위를 확인해 주세요.');renderResult(event.data.result);offerShare($('optimizerResult'),{data,base,progress,products,options:config},event.data.result);}}
  };
  worker.onerror=()=>{if(token!==generation)return;busy(false);worker?.terminate();worker=null;message('계산 도중 오류가 발생했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.',true);};
  worker.postMessage({data,base,progress,products,options:config});
 }catch(error){if(token!==generation)return;busy(false);message(error.message,true);}
});
$('optimizerCancel').addEventListener('click',()=>{generation++;worker?.terminate();worker=null;busy(false);message('계산을 취소했습니다.');});
window.addEventListener('storage',event=>{if([BASE_KEY,PROGRESS_KEY,BASE_KEY+':manufacture-products',KEY,null].includes(event.key)){resetResult();if(event.key===KEY)saved=normalizeOptions(read(KEY,{}));fillInputs();message('저장된 정보가 변경되었습니다. 다시 계산해 주세요.');}});
window.addEventListener('pageshow',()=>{resetResult();fillInputs();});
window.addEventListener('base-products-changed',()=>{resetResult();message('생산 품목이 변경되었습니다. 다시 계산해 주세요.');});
fillInputs();

window.addEventListener('account-import-applied',()=>{resetResult();fillInputs();message('계정 정보가 갱신되었습니다. 생산 품목을 확인한 뒤 계산해 주세요.');});
