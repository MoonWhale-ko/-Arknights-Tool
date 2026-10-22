import {INVENTORY_KEY,readInventory,countOf,saveCount,categoryOf,tierOf} from './inventory-state.mjs?v=6';
import {compareDepotItems} from './depot-order.mjs?v=1';
const $=id=>document.getElementById(id),esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const categories={all:'전체',consumable:'소모 물품',basic:'기본 물품',growth:'육성 재료'};
const kinds={material:'육성 재료',experience:'작전기록',chip:'정예화 칩',skill:'스킬개론',module:'모듈 재료',potential:'증표',currency:'재화'};
const tabPaths={all:'<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>',consumable:'<path d="M14 3a9 9 0 1 0 7 14l-9-5 9-5a9 9 0 0 0-7-4Z"/><path d="m14 12 8-4v8Z"/>',basic:'<path d="m12 2 10 5v10l-10 5-10-5V7Zm0 3L5 8l7 4 7-4Zm-7 6v4l6 3v-4Zm9 3v4l5-3v-4Z"/>',growth:'<circle cx="8" cy="5" r="3"/><path d="m3 11 6-2 4 5 5-7 5 15H1Zm5 2-3 6h11l-6-6Z"/>'};
let items=[],images={},inventory,metadata={},category='all',selected='',showOwned=true,storageError=false;
const frameTier=item=>metadata.rarities?.[item.id]||Math.max(1,Math.min(6,Math.trunc(Number(tierOf(item)))||1));
const gameCategory=item=>({CONSUME:'consumable',NORMAL:'basic',MATERIAL:'growth'}[metadata.classifyTypes?.[item.id]]||(item.id.startsWith('voucher_')?'consumable':categoryOf(item)==='currency'?'basic':'growth'));
function quantity(n){if(n<10000)return n.toLocaleString('ko-KR');const unit=n>=1000000?1000000:1000;return (Math.floor(n/unit*10)/10).toLocaleString('en-US',{maximumFractionDigits:1})+(unit===1000000?'M':'K')}
function image(item){return `<img src="${esc(images[item.id]?.url||fallback(item))}" data-fallback="${esc(fallback(item))}" alt="" data-framed="${String((images[item.id]?.url||fallback(item)).includes('/fexli/ArknightsResource/'))}" loading="lazy">`}
function fallback(item){return 'https://raw.githubusercontent.com/fexli/ArknightsResource/main/items/'+encodeURIComponent(item.iconId)+'.png'}
function bindImages(root){root.querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{if(img.dataset.fallback){img.dataset.framed='true';img.src=img.dataset.fallback;delete img.dataset.fallback}else{img.style.visibility='hidden';delete img.dataset.framed}}))}
function render(){
 for(const button of $('categories').querySelectorAll('[data-category]'))button.setAttribute('aria-pressed',String(button.dataset.category===category));
 const query=$('search').value.trim().toLowerCase(),sub=$('subcategory').value;
 const list=items.filter(i=>(category==='all'||gameCategory(i)===category)&&(sub==='all'||categoryOf(i)===sub)&&(showOwned?countOf(inventory,i.id)>0:countOf(inventory,i.id)===0)&&i.name.toLowerCase().includes(query));
 $('itemTotal').textContent=list.length+'종';
 $('items').classList.toggle('is-empty',!list.length);
 $('items').innerHTML=list.map(i=>`<button type="button" class="item ${countOf(inventory,i.id)?'':'zero'}" data-id="${esc(i.id)}" aria-pressed="${selected===i.id}" aria-haspopup="dialog" aria-controls="itemDialog" aria-label="${esc(i.name)} · 보유 ${countOf(inventory,i.id).toLocaleString('ko-KR')}개" title="${esc(i.name)}"><span class="item-art" data-tier="${frameTier(i)}">${image(i)}<span class="quantity" title="${countOf(inventory,i.id).toLocaleString('ko-KR')}">${quantity(countOf(inventory,i.id))}</span></span></button>`).join('')||'<p class="no-items">조건에 맞는 아이템이 없습니다.</p>';
 const lmd=items.find(i=>i.id==='4001');$('wallet').innerHTML=lmd?image(lmd)+`<span>용문폐</span><strong>${countOf(inventory,'4001').toLocaleString('ko-KR')}</strong>`:'';
 bindImages($('items'));bindImages($('wallet'));
}
function detail(){
 const item=items.find(i=>i.id===selected);if(!item)return;
 $('detail').innerHTML=`<div class="detail-hero"><div class="detail-art" data-tier="${frameTier(item)}">${image(item)}</div><div><div class="detail-eyebrow">ITEM</div><h2 id="itemTitle">${esc(item.name)}</h2><p class="kind">${kinds[categoryOf(item)]}</p></div></div><form id="quantityForm"><label for="quantity">보유 수량</label><div class="quantity-editor"><input id="quantity" type="number" min="0" max="9007199254740991" step="1" value="${countOf(inventory,item.id)}" required ${storageError?'disabled':''}><button type="submit" ${storageError?'disabled':''}>수량 저장</button></div></form>`;
 bindImages($('detail'));
 $('quantityForm').addEventListener('submit',e=>{e.preventDefault();try{inventory=saveCount(localStorage,item.id,$('quantity').value);render();$('detailStatus').textContent=$('status').textContent=item.name+' 보유 수량을 저장했습니다.'}catch(error){$('detailStatus').textContent=error.message}});
}
$('categories').innerHTML=Object.entries(categories).map(([id,name])=>`<button type="button" data-category="${id}" aria-pressed="${id===category}"><svg viewBox="0 0 24 24" aria-hidden="true">${tabPaths[id]}</svg><span>${name}</span></button>`).join('');
$('categories').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(b){category=b.dataset.category;$('subcategory').value='all';$('itemViewport').scrollLeft=0;render()}});
$('items').addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(b){selected=b.dataset.id;render();detail();$('detailStatus').textContent='';$('itemDialog').showModal()}});
$('detailClose').addEventListener('click',()=>$('itemDialog').close());
$('itemDialog').addEventListener('close',()=>{const id=selected;selected='';render();$('items').querySelector(`[data-id="${CSS.escape(id)}"]`)?.focus({preventScroll:true})});
for(const id of ['search','subcategory'])$(id).addEventListener(id==='search'?'input':'change',()=>{$('itemViewport').scrollLeft=0;render()});
$('ownedOnly').addEventListener('click',()=>{showOwned=!showOwned;$('ownedOnly').setAttribute('aria-checked',String(showOwned));$('ownedOnly').title=showOwned?'보유 아이템 표시 중 · 누르면 미보유 아이템 표시':'미보유 아이템 표시 중 · 누르면 보유 아이템 표시';$('itemViewport').scrollLeft=0;render()});
$('itemViewport').addEventListener('wheel',e=>{const box=$('itemViewport');if(e.ctrlKey||e.shiftKey||Math.abs(e.deltaX)>=Math.abs(e.deltaY)||box.scrollWidth<=box.clientWidth)return;const direction=e.deltaY;if(direction>0&&box.scrollLeft>=box.scrollWidth-box.clientWidth-1||direction<0&&box.scrollLeft<=0)return;e.preventDefault();box.scrollLeft+=direction*(e.deltaMode===1?20:e.deltaMode===2?box.clientWidth:1)},{passive:false});
function refreshInventory(){try{inventory=readInventory(localStorage);storageError=false;render();if($('itemDialog').open)detail();$('status').textContent='보유 재료 정보를 갱신했습니다.'}catch(error){storageError=true;$('status').textContent=error.message;if($('itemDialog').open){detail();$('detailStatus').textContent=error.message}}}
window.addEventListener('account-import-applied',refreshInventory);
window.addEventListener('storage',e=>{if(e.key===INVENTORY_KEY)refreshInventory()});
try{
 const [data,map,growth,order]=await Promise.all(['data/items.json','data/item-images.json','data/growth.json','data/depot-order.json'].map(url=>fetch(url,{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('창고 데이터를 불러오지 못했습니다.');return r.json()})));
 items=Object.values({...growth.items,...growth.tokenItems,...data.items});images=map.items;metadata=order;
 try{inventory=readInventory(localStorage)}catch(error){inventory={items:{}};storageError=true;$('status').textContent=error.message+' 기존 데이터 보호를 위해 수량 저장을 중지했습니다.'}
 items.sort((a,b)=>compareDepotItems(a,b,order.sortIds));render();
}catch(error){$('items').classList.add('is-empty');$('items').textContent=error.message}
