import {INVENTORY_KEY,readInventory,countOf,saveCount,categoryOf,tierOf,compareItems} from './inventory-state.mjs?v=2';
const $=id=>document.getElementById(id),esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const categories={all:'전체',material:'육성 재료',chip:'정예화 칩',skill:'스킬개론',module:'모듈 재료',currency:'재화'};
const colors=['','#969fa6','#9bba4f','#5aa3d1','#a889c3','#e5b956'];
let items=[],images={},inventory,category='all',selected='',ownedOnly=false,storageError=false;
function image(item){return `<img src="${esc(images[item.id]?.url||fallback(item))}" data-fallback="${esc(fallback(item))}" alt="${esc(item.name)}" loading="lazy">`}
function fallback(item){return 'https://raw.githubusercontent.com/fexli/ArknightsResource/main/items/'+encodeURIComponent(item.iconId)+'.png'}
function bindImages(root){root.querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{if(img.dataset.fallback){img.src=img.dataset.fallback;delete img.dataset.fallback}else img.style.visibility='hidden'}))}
function render(){
 $('categories').innerHTML=Object.entries(categories).map(([id,name])=>`<button type="button" data-category="${id}" aria-pressed="${id===category}">${name}</button>`).join('');
 const query=$('search').value.trim().toLowerCase(),list=items.filter(i=>(category==='all'||categoryOf(i)===category)&&(!ownedOnly||countOf(inventory,i.id)>0)&&i.name.toLowerCase().includes(query));
 $('itemTotal').textContent=list.length+'종';
 $('items').innerHTML=list.map((i,index)=>`${category==='all'&&(index===0||categoryOf(list[index-1])!==categoryOf(i))?'<h2 class="item-group-heading">'+categories[categoryOf(i)]+'</h2>':''}<button type="button" class="item ${countOf(inventory,i.id)?'':'zero'}" data-id="${i.id}" aria-pressed="${selected===i.id}" aria-label="${esc(i.name)} · 보유 ${countOf(inventory,i.id)}개" style="--tier:${colors[tierOf(i)]}"><span class="hex">${image(i)}<span class="quantity">${countOf(inventory,i.id).toLocaleString('ko-KR')}</span></span><span class="item-name">${esc(i.name)}</span></button>`).join('')||'<p class="no-items">조건에 맞는 아이템이 없습니다.</p>';
 const lmd=items.find(i=>i.id==='4001');$('wallet').innerHTML=lmd?image(lmd)+`<span>용문폐</span><strong>${countOf(inventory,'4001').toLocaleString('ko-KR')}</strong>`:'';
 bindImages($('items'));bindImages($('wallet'));
}
function detail(){const item=items.find(i=>i.id===selected);if(!item)return;
 $('detail').innerHTML=image(item)+`<h2>${esc(item.name)}</h2><div class="kind">${categories[categoryOf(item)]}</div><form id="quantityForm"><label for="quantity">보유 수량</label><input id="quantity" type="number" min="0" max="9007199254740991" step="1" value="${countOf(inventory,item.id)}" required ${storageError?'disabled':''}><button type="submit" ${storageError?'disabled':''}>수량 저장</button></form>`;
 bindImages($('detail'));$('quantityForm').addEventListener('submit',e=>{e.preventDefault();try{inventory=saveCount(localStorage,item.id,$('quantity').value);render();$('status').textContent=item.name+' 보유 수량을 저장했습니다.'}catch(error){$('status').textContent=error.message}});
 if(matchMedia('(max-width:700px)').matches)$('detail').scrollIntoView({behavior:'smooth',block:'nearest'});
}
$('categories').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(b){category=b.dataset.category;render()}});
$('items').addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(b){selected=b.dataset.id;render();detail()}});
$('search').addEventListener('input',render);$('ownedOnly').addEventListener('click',()=>{ownedOnly=!ownedOnly;$('ownedOnly').setAttribute('aria-pressed',String(ownedOnly));render()});
window.addEventListener('storage',e=>{if(e.key===INVENTORY_KEY){try{inventory=readInventory(localStorage);storageError=false;render();detail();$('status').textContent='보유 재료 정보를 갱신했습니다.'}catch(error){storageError=true;$('status').textContent=error.message;detail()}}});
try{const [data,map]=await Promise.all(['data/items.json','data/item-images.json'].map(url=>fetch(url).then(r=>{if(!r.ok)throw Error('배낭 데이터를 불러오지 못했습니다.');return r.json()})));items=Object.values(data.items);images=map.items;try{inventory=readInventory(localStorage)}catch(error){inventory={items:{}};storageError=true;$('status').textContent=error.message+' 기존 데이터 보호를 위해 수량 저장을 중지했습니다.'}items.sort(compareItems);render()}catch(error){$('items').textContent=error.message}
