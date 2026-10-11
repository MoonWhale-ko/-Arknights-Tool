export const BASE_KEY='arknightsBaseLayoutV1';
export const FACILITIES={
 TRADING:{name:'무역소',css:'trading',capacity:[1,2,3]},MANUFACTURE:{name:'제조소',css:'factory',capacity:[1,2,3]},POWER:{name:'발전소',css:'power',capacity:[1,1,1]},
 CONTROL:{name:'제어 센터',css:'control',capacity:[1,2,3,4,5]},DORMITORY:{name:'숙소',css:'dorm',capacity:[5,5,5,5,5]},MEETING:{name:'응접실',css:'reception',capacity:[2,2,2]},WORKSHOP:{name:'가공소',css:'workshop',capacity:[1,1,1]},HIRE:{name:'사무실',css:'office',capacity:[1,1,1]},TRAINING:{name:'훈련실',css:'training',capacity:[2,2,2]},PRIVATE:{name:'활동실',css:'private',capacity:[1,1,1]}
};
export const BASE_SLOTS=[
 ['slot_24','production','TRADING','무역소 1'],['slot_25','production','MANUFACTURE','제조소 1'],['slot_26','production','POWER','발전소 1'],
 ['slot_14','production','TRADING','무역소 2'],['slot_15','production','MANUFACTURE','제조소 2'],['slot_16','production','POWER','발전소 2'],
 ['slot_5','production','MANUFACTURE','제조소 3'],['slot_6','production','MANUFACTURE','제조소 4'],['slot_7','production','POWER','발전소 3'],
 ['slot_34','living','CONTROL','제어 센터'],['slot_28','living','DORMITORY','숙소 1'],['slot_20','living','DORMITORY','숙소 2'],['slot_9','living','DORMITORY','숙소 3'],['slot_3','living','DORMITORY','숙소 4'],
 ['slot_36','support','MEETING','응접실'],['slot_32','support','WORKSHOP','가공소'],['slot_23','support','HIRE','사무실'],['slot_13','support','TRAINING','훈련실'],
 ['slot_47','private','PRIVATE','활동실 1'],['slot_51','private','PRIVATE','활동실 2'],['slot_44','private','PRIVATE','활동실 3'],['slot_50','private','PRIVATE','활동실 4'],['slot_41','private','PRIVATE','활동실 5'],['slot_49','private','PRIVATE','활동실 6']
];
const object=v=>v && typeof v==='object' && !Array.isArray(v);
const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
export function capacity(type,level){return FACILITIES[type]?.capacity[level-1]??0;}
export function normalizeBuilding(building,troop={}){
 if(!object(building?.roomSlots))return null;
 const rooms=[];
 for(const [slotId,group,fallback] of BASE_SLOTS){
  const raw=building.roomSlots[slotId];if(!object(raw)||!raw.roomId)continue;
  const type=raw.roomId;if(!Object.hasOwn(FACILITIES,type))continue;
  if(group==='production'?!['TRADING','MANUFACTURE','POWER'].includes(type):type!==fallback)continue;
  const ownerIds=type==='PRIVATE'?building.rooms?.PRIVATE?.[slotId]?.owners:raw.charInstIds;
  const occupantsKnown=Array.isArray(ownerIds);
  if(!integer(raw.level,0,FACILITIES[type].capacity.length)||(type!=='PRIVATE'&&!occupantsKnown))return null;
  const instances=[...new Set((occupantsKnown?ownerIds:[]).filter(id=>typeof id==='number'||(typeof id==='string'&&/^\d+$/.test(id))).map(Number).filter(id=>integer(id,1,Number.MAX_SAFE_INTEGER)))];
  const count=instances.length;if(count>capacity(type,raw.level))return null;
  const operators=instances.map(id=>troop[id]?.charId||building.chars?.[id]?.charId).filter(id=>typeof id==='string'&&/^char_[a-zA-Z0-9_]+$/.test(id));
  rooms.push({slotId,type,level:raw.level,count,operators,...(type==='PRIVATE'?{occupantsKnown}:{})});
 }
 return {version:1,rooms,privateRoomsIncluded:true};
}
export function prepareBase(building,importedAt){
 if(building===undefined||building===null)return null;
 if(building.version!==1||!Array.isArray(building.rooms)||building.rooms.length>BASE_SLOTS.length)throw new Error('기반시설 데이터 형식이 올바르지 않습니다.');
 const rooms={},slots=new Map(BASE_SLOTS.map(row=>[row[0],row]));
 for(const room of building.rooms){
  const slot=slots.get(room?.slotId);const type=room?.type;
  if(!slot||Object.hasOwn(rooms,room.slotId)||!Object.hasOwn(FACILITIES,type)||
   (slot[1]==='production'?!['TRADING','MANUFACTURE','POWER'].includes(type):type!==slot[2])||
   !integer(room.level,0,FACILITIES[type].capacity.length)||!integer(room.count,0,capacity(type,room.level))||
   !Array.isArray(room.operators)||room.operators.length>room.count||room.operators.some(id=>typeof id!=='string'||!/^char_[a-zA-Z0-9_]+$/.test(id)))throw new Error('기반시설 데이터 형식이 올바르지 않습니다.');
  if(room.trust!==undefined&&(!object(room.trust)||Object.entries(room.trust).some(([id,value])=>!room.operators.includes(id)||!integer(value,0,200))))throw new Error('활동실 신뢰도 데이터 형식이 올바르지 않습니다.');
  rooms[room.slotId]={type,level:room.level,count:room.count,operators:[...room.operators],...(type==='PRIVATE'?{occupantsKnown:room.occupantsKnown!==false,trust:{...(room.trust??{})}}:{})};
 }
 return {version:2,server:'kr',source:'account',importedAt,rooms,privateRoomsIncluded:building.privateRoomsIncluded===true};
}
export function readBase(value){
 if(value?.version===2&&object(value.rooms)){
  const prepared=prepareBase({version:1,privateRoomsIncluded:value.privateRoomsIncluded,rooms:Object.entries(value.rooms).map(([slotId,room])=>({slotId,...room,operators:room.operators??[]}))},value.importedAt);
  return {...prepared,source:value.source==='account'?'account':'manual',modifiedAt:value.modifiedAt};
 }
 const rooms={};for(const [slotId,,type,name] of BASE_SLOTS){const old=value?.[name];const max=FACILITIES[type].capacity.length;const level=integer(old?.level,1,max)?old.level:type==='PRIVATE'?0:1;const count=integer(old?.count,0,capacity(type,level))?old.count:0;rooms[slotId]={type,level,count,operators:[]};}
 return {version:2,source:'manual',rooms};
}
