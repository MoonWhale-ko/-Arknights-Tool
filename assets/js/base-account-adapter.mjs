const KEY='arknightsOperatorProgressV1';
export async function createBaseAccountAdapter(storage=localStorage){
 const response=await fetch('data/operators.json',{cache:'no-cache'});
 if(!response.ok)throw Error('오퍼레이터 데이터를 불러오지 못했습니다.');
 const data=await response.json();
 const chars=(data.operators??[]).filter(c=>c.id&&c.name&&Number(c.rarity)>=1&&Number(c.rarity)<=6&&c.profession&&c.phases?.length);
 if(!chars.length)throw Error('오퍼레이터 데이터가 비어 있습니다.');
 return {chars,key:KEY,get state(){
  try{const value=JSON.parse(storage.getItem(KEY)??'{}');if(!value||typeof value!=='object'||Array.isArray(value))throw Error();return value;}
  catch{throw Error('저장된 육성 정보를 읽지 못했습니다. 기존 정보를 확인해 주세요.');}
 },replace(){window.dispatchEvent(new Event('account-import-applied'));}};
}
