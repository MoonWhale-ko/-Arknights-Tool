import {calculatePlans,ownedAmount,recipeCapacity} from './growth-costs.mjs';
import {readInventory,INVENTORY_KEY,compareItems} from './inventory-state.mjs?v=4';
const $=id=>document.getElementById(id),dialog=$('growthDialog');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>v.toLocaleString('ko-KR');
let operators=[],data,items={},images={},loaded=false,selection='';
const read=key=>{const value=JSON.parse(localStorage.getItem(key)||'{}');if(!value||typeof value!=='object'||Array.isArray(value))throw Error('저장된 육성 정보의 형식을 확인할 수 없습니다.');return value};
function name(id){return id==='exp'?'작전기록 경험치':items[id]?.name||id}
function costText(cost){return cost.map(x=>`${esc(name(x.id))} ×${number(x.count)}`).join(' + ')}
function itemImage(id){const icon=items[id]?.iconId;if(!icon)return '';const fallback='https://raw.githubusercontent.com/fexli/ArknightsResource/main/items/'+encodeURIComponent(icon)+'.png';return `<img src="${esc(images[id]?.url||fallback)}" data-fallback="${esc(fallback)}" alt="" loading="lazy">`}
function recipeHtml(id,inventory,totals){
 const recipes=data.recipes[id]||[];
 if(!recipes.length)return '<span class="muted">—</span>';
 return recipes.map(r=>{const available=recipeCapacity(r,inventory,totals,data),short=Math.max(0,(totals[id]||0)-ownedAmount(id,inventory,data));
  const room=r.room==='WORKSHOP'?'가공소':'제조소',level=Math.max(...r.requirements.map(x=>x.roomLevel));
  return `<details class="growth-recipe"><summary>${room} 제작${short&&available>=short?' · 부족분 제작 가능':available?' · '+number(available)+'개 가능':''}</summary><p>${costText(r.cost)}${r.goldCost?' + 용문폐 ×'+number(r.goldCost):''}<br>→ ${esc(name(id))} ×${r.count}</p><p class="${available?'growth-ok':'muted'}">남는 보유 재료로 최대 ${number(available)}개${available?'':' · 제작 재료 부족'}</p><p class="muted">${room} Lv.${level} 필요${r.stages.length?' · 관련 스테이지 해금 필요':''}</p></details>`}).join('');
}
function render(){
 if(!loaded){$('growthContent').textContent='육성·제작 데이터를 불러오는 중입니다.';return}
 try{
  const inventory=readInventory(localStorage),all=calculatePlans(operators,read('arknightsOperatorProgressV1'),read('arknightsOperatorPlansV1'),data);
  if(!all.results.some(r=>r.operator.id===selection))selection='';
  $('growthOperator').innerHTML='<option value="">전체 계획 합산</option>'+all.results.map(r=>`<option value="${r.operator.id}" ${selection===r.operator.id?'selected':''}>${esc(r.operator.name)}</option>`).join('');
  const results=selection?all.results.filter(r=>r.operator.id===selection):all.results,totals={};
  for(const r of results)for(const [id,count] of Object.entries(r.totals))totals[id]=(totals[id]||0)+count;
  $('growthSummary').textContent=`${results.length}명 계획 · 필요 재료 ${Object.keys(totals).length}종`;
  const ids=Object.keys(totals).sort((a,b)=>a==='exp'?-1:b==='exp'?1:compareItems(items[a]||{id:a},items[b]||{id:b}));
  $('growthContent').innerHTML=(ids.length?`<div class="growth-table-wrap"><table class="growth-table"><thead><tr><th>재료</th><th>추가 필요</th><th>가방 보유</th><th>부족</th><th>제작</th></tr></thead><tbody>${ids.map(id=>{const owned=ownedAmount(id,inventory,data),short=Math.max(0,totals[id]-owned);return `<tr data-material="${id}"><td><div class="growth-item">${itemImage(id)}<span>${esc(name(id))}</span></div></td><td>${number(totals[id])}</td><td>${number(owned)}</td><td class="${short?'growth-short':'growth-ok'}">${number(short)}</td><td>${recipeHtml(id,inventory,totals)}</td></tr>`}).join('')}</tbody></table></div>`:'<p class="growth-empty">'+(results.length?'이 계획에는 일반 육성 재료가 필요하지 않습니다.':'육성 계획에서 보유를 체크하고 목표 상태를 변경해 주세요.')+'</p>')+
   results.map(r=>`<details class="growth-breakdown"><summary>${esc(r.operator.name)} · 단계별 비용${!r.current.owned?' · 획득 예정':''}</summary>${r.steps.map(s=>`<div class="growth-step"><strong>${esc(s.label)}</strong><span>${costText(s.cost)}</span></div>`).join('')}${r.notes.length?'<ul class="growth-notes">'+r.notes.map(n=>`<li>${esc(n)}</li>`).join('')+'</ul>':''}</details>`).join('');
  $('growthContent').querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{if(img.dataset.fallback){img.src=img.dataset.fallback;delete img.dataset.fallback}else img.style.display='none'}));
 }catch(error){$('growthContent').textContent=error.message+' 기존 데이터는 변경하지 않았습니다.'}
}
$('growthOpen').addEventListener('click',()=>{dialog.showModal();render()});
$('growthClose').addEventListener('click',()=>dialog.close());
$('growthOperator').addEventListener('change',e=>{selection=e.target.value;render()});
window.refreshGrowthMaterials=()=>{if(dialog.open)render()};
window.addEventListener('storage',e=>{if(dialog.open&&[INVENTORY_KEY,'arknightsOperatorProgressV1','arknightsOperatorPlansV1'].includes(e.key))render()});
try{
 const [ops,growth,map]=await Promise.all(['data/operators.json','data/growth.json','data/item-images.json'].map(url=>fetch(url,{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('필요 재료 데이터를 불러오지 못했습니다.');return r.json()})));
 if(ops.source.commit!==growth.source.commit)throw Error('육성 데이터 버전이 다릅니다. 새로고침해 주세요.');
 operators=ops.operators;data=growth;items=growth.items;images=map.items;loaded=true;if(dialog.open)render();
}catch(error){loaded=false;$('growthOpen').disabled=true;$('growthSummary').textContent=error.message}
