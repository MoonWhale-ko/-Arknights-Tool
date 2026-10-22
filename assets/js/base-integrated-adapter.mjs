import {J,W} from './infra-v2-terra-engine.mjs';
const known=new Map(J.map(o=>[o.id,o]));
export function prepareIntegratedInput(data,base,progress,products,options,tradingProducts={}){
 const rooms={},owned={},warnings=[];
 for(const [id,state] of Object.entries(progress??{}))if(state?.owned===true){if(!known.has(id)){warnings.push(`${data.characters[id]?.name??id}: 통합 스킬 데이터에 없어 제외했습니다.`);continue;}owned[id]={owned:true,elite:Number(state.elite??0),level:Number(state.level??1)};}
 const current=structuredClone(owned),mode=options.developmentMode==='max'?'max':'current';
 if(mode==='max')for(const [id,state] of Object.entries(owned)){const def=known.get(id),elite=def.rarity>=4?2:def.rarity===3?1:0;state.elite=elite;state.level=W(def.rarity,elite);}
 if(!Object.keys(owned).length)throw Error('보유 오퍼레이터가 없습니다. 계정 가져오기 또는 오퍼레이터 화면에서 보유 상태를 설정해 주세요.');
 for(const [id,r] of Object.entries(base.rooms??{})){
  if(!(r.level>0)||r.type==='PRIVATE')continue;
  if(r.type==='TRADING'&&tradingProducts[id]==='originium')throw Error('현재 통합 엔진은 순금 거래를 지원합니다. 오리지늄 거래 무역소를 순금 거래로 변경하거나 거래 방식을 확인해 주세요.');
  rooms[id]={type:r.type,level:r.level};
  if(r.type==='DORMITORY'){const ambience=options.ambience[id]??r.ambience;if(ambience===null||ambience===undefined||ambience==='')throw Error(`${id}: 숙소 인테리어 점수를 입력해 주세요.`);rooms[id].ambience=Number(ambience);}
 }
 if(!Object.keys(rooms).length)throw Error('건설된 기반시설이 없습니다. 계정 정보를 불러와 주세요.');
 const selected=Object.fromEntries(Object.entries(rooms).filter(([,r])=>r.type==='MANUFACTURE').map(([id])=>{if(!data.recipes[String(products?.[id])])throw Error(`${id}: 제조소 생산 품목을 선택해 주세요.`);return [id,String(products[id])];}));
 return {input:{base:{rooms},progress:owned,products:selected,options:{teams:options.teams,rotation:options.rotation,extraActions:options.extraActions,priority:[...options.priority],missingClues:[],rankingWindow:options.rankingWindow??'24h',development:'current',maxHours:168,optimizeDormSupport:true}},warnings,training:{mode,current}};
}
