export const INVENTORY_KEY='arknightsInventoryV1';
export function readInventory(storage){
 const raw=storage.getItem(INVENTORY_KEY);
 if(raw===null)return {version:1,server:'kr',items:{}};
 const value=JSON.parse(raw);
 if(!value||typeof value!=='object'||Array.isArray(value)||!value.items||typeof value.items!=='object'||Array.isArray(value.items))throw Error('보유 재료 데이터 형식을 확인할 수 없습니다.');
 return value;
}
export function countOf(inventory,id){const n=inventory.items[id];return Number.isSafeInteger(n)&&n>=0?n:0}
export function saveCount(storage,id,value){
 if(typeof id!=='string'||['__proto__','constructor','prototype'].includes(id))throw Error('올바르지 않은 재료입니다.');
 if(!/^\d+$/.test(String(value)))throw Error('수량은 0 이상의 정수로 입력해 주세요.');
 const count=Number(value);if(!Number.isSafeInteger(count))throw Error('수량이 너무 큽니다.');
 const inventory=readInventory(storage);
 inventory.items={...inventory.items,[id]:count};inventory.updatedAt=new Date().toISOString();
 storage.setItem(INVENTORY_KEY,JSON.stringify(inventory));return inventory;
}
export function categoryOf(item){if(item.id==='4001')return 'currency';if(/^200[1-4]$/.test(item.id))return 'experience';if(item.id.startsWith('mod_'))return 'module';if(/^32\d\d$/.test(item.id))return 'chip';if(/^330\d$/.test(item.id))return 'skill';return 'material'}
export function tierOf(item){if(categoryOf(item)==='material')return Math.min(5,Number(item.id.slice(-1))||1);if(categoryOf(item)==='chip')return Number(item.id.slice(-1))+2;if(categoryOf(item)==='module')return 5;return 3}

const CATEGORY_ORDER=['material','experience','chip','skill','module','currency'];
export function familyOf(item){const category=categoryOf(item);if(category==='material')return item.id.startsWith('301')?'301':item.id.slice(0,4);if(category==='chip')return item.id.slice(0,3);return category}
export function compareItems(a,b){return tierOf(b)-tierOf(a)||CATEGORY_ORDER.indexOf(categoryOf(a))-CATEGORY_ORDER.indexOf(categoryOf(b))||familyOf(a).localeCompare(familyOf(b),'en',{numeric:true})||a.id.localeCompare(b.id,'en',{numeric:true})}
