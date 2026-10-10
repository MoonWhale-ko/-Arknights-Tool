import {calculatePlans,ownedAmount,materialRequirements} from './growth-costs.mjs?v=5';
import {readInventory,INVENTORY_KEY,compareItems,tierOf,categoryOf} from './inventory-state.mjs?v=6';
const $=id=>document.getElementById(id),dialog=$('growthDialog');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>v.toLocaleString('ko-KR');
let operators=[],data,items={},images={},loaded=false,selection=null,tier='all';
const read=key=>{const value=JSON.parse(localStorage.getItem(key)||'{}');if(!value||typeof value!=='object'||Array.isArray(value))throw Error('저장된 육성 정보의 형식을 확인할 수 없습니다.');return value};
function name(id){return id==='exp'?'작전기록 경험치':items[id]?.name||id}
function itemImage(id){if(id==='exp')id='2004';const icon=items[id]?.iconId;if(!icon)return '';const fallback='https://raw.githubusercontent.com/fexli/ArknightsResource/main/items/'+encodeURIComponent(icon)+'.png';return `<img src="${esc(images[id]?.url||fallback)}" data-fallback="${esc(fallback)}" alt="" loading="lazy">`}
function tokenInfo(id){return Object.values(data.potentials).find(t=>t.id===id)}
function materialHtml(id){return `<button type="button" class="growth-image-button" data-material-tip="${esc(id)}" ${tokenInfo(id)?`data-token="${esc(id)}"`:''} aria-label="${esc(name(id))}" aria-describedby="potentialTooltip">${itemImage(id)||'<span class="growth-image-fallback">'+esc(name(id))+'</span>'}</button>`}
function costImages(cost){return '<div class="growth-cost-images">'+cost.map(x=>`<span class="growth-cost-piece">${materialHtml(x.id)}<span>× ${number(x.count)}</span></span>`).join('<span class="growth-plus">+</span>')+'</div>'}
function materialNode(node,nested=true,depth=0){
 const short=node.count>node.owned,owned=node.displayOwned??node.owned;
 return `<article class="growth-material-card" data-material="${esc(node.id)}"><div class="growth-material-main">${materialHtml(node.id)}${depth?`<strong class="growth-child-name">${esc(name(node.id))}</strong>`:''}<span class="growth-ratio" aria-label="${esc(name(node.id))} · 보유 ${owned}, 필요 ${node.count}"><b class="${short?'growth-short':''}">${number(owned)}</b><span> / ${number(node.count)}</span></span>${node.recipe?'<small class="growth-craft-label">'+(canCraft(node)?'제작 가능':'하위 재료 부족')+'</small>':''}</div>${nested&&node.children?.length?`<details class="growth-children"><summary>하위 재료 보기<span class="growth-recipe-title"> · ${esc(name(node.id))} 부족분 ${number(node.count-node.owned)}개 제작</span></summary><p class="growth-facility">${node.recipe.room==='WORKSHOP'?'가공소':'제조소'} Lv.${Math.max(0,...node.recipe.requirements.map(x=>x.roomLevel))} · ${number(node.runs)}회${node.recipe.stages.length?' · 스테이지 해금 필요':''}</p><div class="growth-material-grid">${node.children.map(child=>materialNode(child,true,depth+1)).join('')}</div></details>`:''}</article>`;
}
function canCraft(node){return node.children.every(child=>child.owned>=child.count||child.children.length&&canCraft(child))}
function bindImages(root){root.querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{if(img.dataset.fallback){img.src=img.dataset.fallback;delete img.dataset.fallback}else img.style.display='none'}))}
const tooltip=$('potentialTooltip');
function hideTooltip(){tooltip.hidden=true}
function showTooltip(button,inventory,totals){
 const id=button.dataset.materialTip||button.dataset.token,token=tokenInfo(id),short=Math.max(0,(totals[id]||0)-ownedAmount(id,inventory,data));
 const recipe=(data.recipes[id]||[])[0];
 tooltip.innerHTML=`<strong>${esc(name(id))}</strong>`+(recipe?costImages(recipe.cost)+(recipe.goldCost?'<p>용문폐 × '+number(recipe.goldCost)+'</p>':''):'')+(token?(token.alternatives.length?token.alternatives.map(a=>`<div class="token-alternative">${itemImage(a.id)}<div><strong>${esc(name(a.id))}</strong><p>전용 증표 1개당 ${a.count}개로 대체 가능</p><p>부족분 ${short}개 대체에 ${number(short*a.count)}개 필요 · 가방 보유 ${number(ownedAmount(a.id,inventory,data))}개</p></div></div>`).join(''):'<p>이 오퍼레이터는 직군 공용 증표로 대체할 수 없습니다.</p>'):'');
 tooltip.hidden=false;bindImages(tooltip);
 const rect=button.getBoundingClientRect(),box=tooltip.getBoundingClientRect(),bounds=dialog.getBoundingClientRect();
 tooltip.style.left=Math.max(bounds.left+8,Math.min(rect.left,bounds.right-box.width-8))+'px';
 tooltip.style.top=Math.max(bounds.top+8,rect.bottom+box.height+8<bounds.bottom?rect.bottom+6:rect.top-box.height-6)+'px';
}
function render(){
 hideTooltip();
 if(!loaded){$('growthContent').textContent='육성·제작 데이터를 불러오는 중입니다.';return}
 try{
  const inventory=readInventory(localStorage),all=calculatePlans(operators,read('arknightsOperatorProgressV1'),read('arknightsOperatorPlansV1'),data);
  const planned=all.results.map(r=>r.operator),ids=new Set(planned.map(c=>c.id));
  if(selection!==null)selection=new Set([...selection].filter(id=>ids.has(id)));
  const selected=id=>selection===null||selection.has(id),allSelected=planned.length>0&&planned.every(c=>selected(c.id));
  $('growthOperators').innerHTML=`<button type="button" class="growth-select-all" data-growth-all aria-pressed="${allSelected}" ${planned.length?'':'disabled'}>전체 선택</button>`+planned.map(c=>`<button type="button" class="growth-operator-toggle" data-growth-operator="${esc(c.id)}" aria-label="${esc(c.name)} 계획 합산" aria-pressed="${selected(c.id)}"><img src="https://raw.githubusercontent.com/ArknightsAssets/ArknightsAssets2/cn/assets/dyn/arts/charavatars/${encodeURIComponent(c.id)}.png" alt="" loading="lazy"></button>`).join('');
  $('growthOperators').querySelector('[data-growth-all]').addEventListener('click',()=>{selection=allSelected?new Set():null;render()});
  $('growthOperators').querySelectorAll('[data-growth-operator]').forEach(button=>button.addEventListener('click',()=>{if(selection===null)selection=new Set(ids);const id=button.dataset.growthOperator;if(selection.has(id))selection.delete(id);else selection.add(id);render()}));
  bindImages($('growthOperators'));
  const results=all.results.filter(r=>selected(r.operator.id)),totals={};
  for(const r of results)for(const [id,count] of Object.entries(r.totals))totals[id]=(totals[id]||0)+count;
  $('growthSummary').textContent=`${results.length}명 계획 · 필요 재료 ${Object.keys(totals).length}종`;
  const requirements=materialRequirements(totals,inventory,data),sort=(a,b)=>compareItems(items[a.id]||{id:a.id},items[b.id]||{id:b.id});
  const selectedRows=tier==='all'?requirements.roots:requirements.rows.filter(row=>tier==='other'?(row.id==='exp'||categoryOf(items[row.id]||{id:row.id})!=='material'):row.id!=='exp'&&categoryOf(items[row.id]||{id:row.id})==='material'&&tierOf(items[row.id]||{id:row.id})===Number(tier));
  $('growthContent').innerHTML=(Object.keys(totals).length?`<nav class="growth-tier-tabs" aria-label="재료 티어">${[['all','필요 재료'],...['5','4','3','2','1'].map(t=>[t,t+'T']),['other','재화·기타']].map(([value,label])=>`<button type="button" data-growth-tier="${value}" aria-pressed="${tier===value}">${label}</button>`).join('')}</nav><p class="growth-help">${tier==='all'?'보유량 / 필요량 · 빨간 숫자는 부족한 보유량입니다.':'직접 필요 재료와 부족분 제작에 들어가는 하위 재료를 합산했습니다. 보유량은 이 계획에 배분된 수량입니다.'}</p><div class="growth-material-grid">${selectedRows.sort(sort).map(node=>materialNode(node,tier==='all')).join('')||'<p class="muted">이 티어에 필요한 재료가 없습니다.</p>'}</div>`:'<p class="growth-empty">'+(results.length?'이 계획에는 일반 육성 재료가 필요하지 않습니다.':(all.results.length?'합산할 오퍼레이터 얼굴을 선택해 주세요.':'육성 계획에서 보유를 체크하고 목표 상태를 변경해 주세요.'))+'</p>')+
   results.map(r=>`<details class="growth-breakdown"><summary>${esc(r.operator.name)}${r.operator.isFuture?' · 미래시 (중국 서버 기준)':''} · 단계별 비용${!r.current.owned?' · 획득 예정':''}</summary>${r.steps.map(s=>`<div class="growth-step"><strong>${esc(s.label)}</strong>${costImages(s.cost)}</div>`).join('')}${r.notes.length?'<ul class="growth-notes">'+r.notes.map(n=>`<li>${esc(n)}</li>`).join('')+'</ul>':''}</details>`).join('');
  $('growthContent').querySelectorAll('[data-growth-tier]').forEach(button=>button.addEventListener('click',()=>{tier=button.dataset.growthTier;render()}));
  bindImages($('growthContent'));
  $('growthContent').querySelectorAll('[data-material-tip]').forEach(button=>{
   button.addEventListener('pointerenter',()=>showTooltip(button,inventory,totals));
   button.addEventListener('pointerleave',hideTooltip);
   button.addEventListener('focus',()=>showTooltip(button,inventory,totals));
   button.addEventListener('blur',hideTooltip);
   button.addEventListener('click',()=>showTooltip(button,inventory,totals));
  });
 }catch(error){$('growthContent').textContent=error.message+' 기존 데이터는 변경하지 않았습니다.'}
}
$('growthOpen').addEventListener('click',()=>{dialog.showModal();render()});
$('growthClose').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',hideTooltip);
dialog.addEventListener('scroll',hideTooltip);
window.addEventListener('resize',hideTooltip);
window.refreshGrowthMaterials=()=>{if(dialog.open)render()};
window.addEventListener('storage',e=>{if(dialog.open&&[INVENTORY_KEY,'arknightsOperatorProgressV1','arknightsOperatorPlansV1'].includes(e.key))render()});
try{
 const [ops,growth,map]=await Promise.all(['data/operators.json','data/growth.json','data/item-images.json'].map(url=>fetch(url,{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('필요 재료 데이터를 불러오지 못했습니다.');return r.json()})));
 if(ops.source.commit!==growth.source.commit)throw Error('육성 데이터 버전이 다릅니다. 새로고침해 주세요.');
 operators=ops.operators;data=growth;items={...growth.items,...growth.tokenItems};images=map.items;loaded=true;if(dialog.open)render();
}catch(error){loaded=false;$('growthOpen').disabled=true;$('growthSummary').textContent=error.message}
