import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  prepareImport,
  commitImport,
  restoreImport,
  BACKUP_KEY,
  INVENTORY_KEY,
  trustPercent,
} from "../assets/js/account-state.mjs";
const { operators: chars } = JSON.parse(
  readFileSync(new URL("../data/operators.json", import.meta.url)),
);
const { frames } = JSON.parse(
  readFileSync(new URL("../data/account-favor.json", import.meta.url)),
);
const op = chars.find((c) => c.id === "char_103_angel");
const data = {
  version: 1,
  server: "kr",
  importedAt: "2026-10-02T00:00:00Z",
  operators: [
    {
      id: op.id,
      elite: 2,
      level: 90,
      potential: 4,
      favorPoint: frames.at(-1).points,
      skill: 7,
      skills: op.skills.map((s, i) => ({ id: s.id, mastery: i })),
      modules: { [op.modules[0].id]: 3 },
    },
  ],
  inventory: { 4001: 12345 },
};
test("map skill IDs/modules, preserve user fields, authoritative ownership", () => {
  const previous = {
    [op.id]: { target: { elite: 2 }, mods: { X: 2 } },
    char_124_kroos: { owned: true, level: 55, target: "keep" },
  };
  const p = prepareImport(data, chars, previous, frames);
  assert.deepEqual(p.state[op.id].m, [0, 1, 2]);
  assert.equal(p.state[op.id].trust, 200);
  assert.equal(p.state[op.id].mods[op.modules[0].id], 3);
  assert.deepEqual(p.state[op.id].target, { elite: 2 });
  assert.equal(p.state.char_124_kroos.owned, false);
  assert.equal(previous.char_124_kroos.owned, true);
});
function storage() {
  const map = new Map([
    ["progress", '{"original":true}'],
    [INVENTORY_KEY, '{"previous":true}'],
  ]);
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
  };
}
test("backup and undo both progress and inventory", () => {
  const s = storage(),
    p = prepareImport(data, chars, {}, frames);
  commitImport(s, "progress", p);
  assert.ok(s.getItem(BACKUP_KEY));
  assert.deepEqual(restoreImport(s, "progress"), { original: true });
  assert.equal(s.getItem(INVENTORY_KEY), '{"previous":true}');
});
test("storage write failure restores original snapshot", () => {
  const s = storage(),
    set = s.setItem;
  let failed = false;
  s.setItem = (k, v) => {
    if (k === "progress" && !failed) {
      failed = true;
      throw new Error("quota");
    }
    set(k, v);
  };
  assert.throws(
    () => commitImport(s, "progress", prepareImport(data, chars, {}, frames)),
    /quota/,
  );
  assert.equal(s.getItem(INVENTORY_KEY), '{"previous":true}');
  assert.equal(s.getItem("progress"), '{"original":true}');
});
test("malformed data cannot clear ownership or replace inventory", () => {
  assert.throws(() =>
    prepareImport({ ...data, operators: [] }, chars, {}, frames),
  );
  assert.throws(() =>
    prepareImport({ ...data, inventory: { 4001: -1 } }, chars, {}, frames),
  );
  assert.throws(() =>
    prepareImport(
      { ...data, operators: [{ ...data.operators[0], elite: 5 }] },
      chars,
      {},
      frames,
    ),
  );
});
test("trust boundaries follow favor frame lookup", () => {
  assert.equal(trustPercent(0, frames), 0);
  assert.equal(trustPercent(frames[100].points, frames), 100);
  assert.equal(trustPercent(frames.at(-1).points + 1, frames), 200);
});

test("excluded IDs retain KR in-game names and unknown IDs remain visible",()=>{
 const names=JSON.parse(readFileSync(new URL("../data/account-characters.json",import.meta.url))).characters;
 const missing={...data.operators[0],id:"char_508_aguard"},unknown={...missing,id:"char_new_unknown"};
 const p=prepareImport({...data,operators:[...data.operators,missing,unknown]},chars,{},frames,names);
 assert.equal(p.skipped,2);assert.equal(p.owned,1);
 assert.deepEqual(p.skippedOperators,[{id:missing.id,name:"샤프",obtainable:false},{id:unknown.id,name:null,obtainable:null}]);
 assert.equal(p.state[missing.id],undefined);
 const fallback=prepareImport({...data,operators:[...data.operators,missing]},chars,{},frames);assert.equal(fallback.skippedOperators[0].id,missing.id);
});

test("Amiya forms are saved separately and counted as one character",()=>{
 const forms=chars.filter(c=>c.sharedGroup==='char_002_amiya');
 const operators=forms.map((c,i)=>({...data.operators[0],id:c.id,level:80,skills:c.skills.map(s=>({id:s.id,mastery:i+1})),modules:Object.fromEntries(c.modules.map(m=>[m.id,i+1]))}));
 for(const list of [operators,operators.slice().reverse()]){
  const p=prepareImport({...data,operators:list},chars,{},frames);
  assert.equal(p.owned,1);assert.equal(p.skipped,0);assert.equal(p.classVariantCount,2);
  for(const [i,c] of forms.entries()){assert.equal(p.state[c.id].m[0],i+1);assert.equal(p.state[c.id].mods[c.modules[0].id],i+1);assert.equal(p.state[c.id].owned,true);}
 }
});
test("legacy Amiya forms link to one operator without overwriting caster skills",()=>{
 const a=chars.find(c=>c.id==="char_002_amiya");
 const caster={...data.operators[0],id:a.id,level:80,skills:a.skills.map(s=>({id:s.id,mastery:2})),modules:{}};
 const guard={...caster,id:"char_1001_amiya2",skills:[{id:"guard-skill",mastery:3}],modules:{guard_module:1}};
 const medic={...caster,id:"char_1037_amiya3",skills:[{id:"medic-skill",mastery:1}],modules:{medic_module:2}};
 for(const operators of [[caster,guard,medic],[medic,guard,caster]]){
  const p=prepareImport({...data,operators},chars.filter(c=>!c.baseId),{},frames);
  assert.equal(p.owned,1);assert.equal(p.skipped,0);assert.equal(p.classVariantCount,2);
  assert.equal(p.state[a.id].owned,true);assert.equal(p.state[a.id].m[0],2);
  assert.deepEqual(p.state[a.id].classVariants[guard.id].skills,guard.skills);
  assert.deepEqual(p.state[a.id].classVariants[medic.id].modules,medic.modules);
  assert.equal(p.state[guard.id],undefined);assert.equal(p.state[medic.id],undefined);
 }
 assert.throws(()=>prepareImport({...data,operators:[guard]},chars.filter(c=>!c.baseId),{},frames),/基本|기본/);
 assert.throws(()=>prepareImport({...data,operators:[caster,{...medic,skills:[{id:"bad",mastery:4}]}]},chars.filter(c=>!c.baseId),{},frames),/직군 전환/);
});

import {BASE_KEY,BASE_SLOTS,normalizeBuilding,prepareBase,readBase} from '../assets/js/base-state.mjs';
const baseFixture={roomSlots:{
 slot_34:{roomId:'CONTROL',level:5,charInstIds:[1,2,-1,-1,-1]},
 slot_24:{roomId:'MANUFACTURE',level:2,charInstIds:[1,-1]},
 slot_25:{roomId:'TRADING',level:3,charInstIds:[2,3,-1]},
 slot_26:{roomId:'POWER',level:3,charInstIds:[-1]},
 slot_28:{roomId:'DORMITORY',level:1,charInstIds:[1,2,3,-1,-1]},
 slot_41:{roomId:'PRIVATE',level:1,charInstIds:[1]},
},chars:{1:{charId:'char_002_amiya'},2:{charId:'char_103_angel'}}};
test('building snapshot keeps real slot types, levels and occupied seats only',()=>{
 const normalized=normalizeBuilding(baseFixture,{3:{charId:'char_124_kroos'}});
 assert.equal(normalized.rooms.length,6);
 const prepared=prepareBase(normalized,data.importedAt);
 assert.deepEqual(prepared.rooms.slot_24,{type:'MANUFACTURE',level:2,count:1,operators:['char_002_amiya']});
 assert.equal(prepared.rooms.slot_25.type,'TRADING');assert.equal(prepared.rooms.slot_25.count,2);
 assert.equal(prepared.rooms.slot_26.count,0);assert.equal(prepared.rooms.slot_28.count,3);
 assert.equal(prepared.rooms.slot_41.type,'PRIVATE');assert.equal(prepared.rooms.slot_41.occupantsKnown,false);assert.equal(prepared.rooms.slot_5,undefined);
 assert.deepEqual(readBase(prepared).rooms,prepared.rooms);
 assert.deepEqual(BASE_SLOTS.filter(s=>s[1]==='production').map(s=>s[0]),['slot_24','slot_25','slot_26','slot_14','slot_15','slot_16','slot_5','slot_6','slot_7']);
});
test('building is applied atomically and undo restores prior manual facility settings',()=>{
 const s=storage(),previous=JSON.stringify({'제조소 1':{level:2,count:1}});s.setItem(BASE_KEY,previous);
 const p=prepareImport({...data,building:normalizeBuilding(baseFixture)},chars,{},frames);
 commitImport(s,'progress',p);assert.equal(JSON.parse(s.getItem(BASE_KEY)).source,'account');
 restoreImport(s,'progress');assert.equal(s.getItem(BASE_KEY),previous);
 const write=s.setItem;let fail=true;s.setItem=(key,value)=>{if(key==='progress'&&fail){fail=false;throw Error('quota');}write(key,value);};
 assert.throws(()=>commitImport(s,'progress',p),/quota/);assert.equal(s.getItem(BASE_KEY),previous);assert.equal(s.getItem(INVENTORY_KEY),'{"previous":true}');
});
test('missing building keeps settings while old backups do not delete facility settings',()=>{
 const s=storage();s.setItem(BASE_KEY,'{"keep":true}');commitImport(s,'progress',prepareImport(data,chars,{},frames));assert.equal(s.getItem(BASE_KEY),'{"keep":true}');
 s.setItem(BACKUP_KEY,JSON.stringify({version:1,progress:null,inventory:null}));restoreImport(s,'progress');assert.equal(s.getItem(BASE_KEY),'{"keep":true}');
});
test('malformed building cannot replace account state and legacy manual values migrate',()=>{
 const room={slotId:'slot_24',type:'MANUFACTURE',level:1,count:2,operators:[]};
 assert.throws(()=>prepareImport({...data,building:{version:1,rooms:[room]}},chars,{},frames),/기반시설/);
 assert.throws(()=>prepareBase({version:1,rooms:[{...room,count:1},{...room,count:1}]},data.importedAt),/기반시설/);
 assert.throws(()=>prepareBase({version:1,rooms:[{...room,slotId:'slot_34',type:'POWER',count:1}]},data.importedAt),/기반시설/);
 const old=readBase({'제조소 1':{level:3,count:3},'발전소 1':{level:3,count:5}});assert.equal(old.rooms.slot_25.level,3);assert.equal(old.rooms.slot_25.count,3);assert.equal(old.rooms.slot_26.count,0);
 const duplicate=normalizeBuilding({roomSlots:{slot_24:{roomId:'TRADING',level:3,charInstIds:[1,'1',-1,0,true]}}});assert.equal(duplicate.rooms[0].count,1);
});

test('activity owners are separate from stationed staff, trust uses actual account points',()=>{
 const raw={roomSlots:{slot_47:{roomId:'PRIVATE',level:1,charInstIds:[]},slot_51:{roomId:'PRIVATE',level:3,charInstIds:[]},slot_44:{roomId:'PRIVATE',level:1,charInstIds:[]}},rooms:{PRIVATE:{slot_47:{owners:[1]},slot_51:{owners:[]},slot_44:{owners:[2]}}}};
 const operator0={...data.operators[0],favorPoint:0},operator200={...data.operators[0],id:'char_002_amiya',level:80,favorPoint:frames.at(-1).points,skills:[],modules:{}};
 const troop={1:{charId:operator0.id},2:{charId:operator200.id}};
 const building=normalizeBuilding(raw,troop),p=prepareImport({...data,operators:[operator0,operator200],building},chars,{},frames);
 assert.equal(p.base.rooms.slot_47.count,1);assert.equal(p.base.rooms.slot_47.trust[operator0.id],0);
 assert.equal(p.base.rooms.slot_44.trust[operator200.id],200);assert.equal(p.base.rooms.slot_51.count,0);
 assert.equal(p.base.rooms.slot_47.occupantsKnown,true);
 const restored=readBase(p.base);assert.deepEqual(restored.rooms.slot_44.trust,p.base.rooms.slot_44.trust);
 const store=storage();commitImport(store,'progress',p);assert.equal(JSON.parse(store.getItem(BASE_KEY)).rooms.slot_44.trust[operator200.id],200);restoreImport(store,'progress');assert.equal(store.getItem(BASE_KEY),null);
 const unknown=normalizeBuilding({...raw,rooms:{PRIVATE:{slot_47:{owners:[9]}}}},troop);const room=unknown.rooms.find(r=>r.slotId==='slot_47');assert.equal(room.count,1);assert.deepEqual(room.operators,[]);
});
test('activity trust validation rejects fake percentages and multiple owners',()=>{
 assert.throws(()=>prepareBase({version:1,rooms:[{slotId:'slot_47',type:'PRIVATE',level:1,count:1,operators:[op.id],trust:{[op.id]:201}}]},data.importedAt),/신뢰도/);
 assert.equal(normalizeBuilding({roomSlots:{slot_47:{roomId:'PRIVATE',level:1,charInstIds:[]}},rooms:{PRIVATE:{slot_47:{owners:[1,2]}}}}),null);
 const old=readBase({version:2,rooms:{slot_24:{type:'TRADING',level:3,count:0,operators:[]}}});assert.equal(old.rooms.slot_47,undefined);
 assert.equal(BASE_SLOTS.filter(s=>s[1]==='private').length,6);
});

test('circulation differs by account and survives import, persistence and undo',async()=>{
 const {CIRCULATION_SLOTS,circulationBuilt}=await import('../assets/js/base-state.mjs');
 const allSlots=Object.fromEntries(CIRCULATION_SLOTS.map(([id,type])=>[id,{roomId:type,level:1}]));
 allSlots.slot_10={roomId:'CORRIDOR',level:0};
 allSlots.slot_2={roomId:'',level:0};
 const first=normalizeBuilding({roomSlots:allSlots});
 assert.equal(first.circulationIncluded,true);
 assert.equal(first.circulation.slot_10,false);assert.equal(first.circulation.slot_2,false);
 assert.equal(first.circulation.slot_29,true);assert.equal(first.circulation.slot_33,true);
 const second=normalizeBuilding({roomSlots:{slot_10:{roomId:'CORRIDOR',level:1},slot_33:{roomId:'ELEVATOR',level:0}}});
 const base1=prepareBase(first,data.importedAt),base2=prepareBase(second,data.importedAt);
 assert.equal(circulationBuilt(base1,'slot_10'),false);assert.equal(circulationBuilt(base2,'slot_10'),true);
 assert.equal(circulationBuilt(base1,'slot_33'),true);assert.equal(circulationBuilt(base2,'slot_33'),false);
 assert.deepEqual(readBase(JSON.parse(JSON.stringify(base1))).circulation,base1.circulation);
 const s=storage();s.setItem(BASE_KEY,JSON.stringify(base1));
 commitImport(s,'progress',prepareImport({...data,building:second},chars,{},frames));
 assert.equal(readBase(JSON.parse(s.getItem(BASE_KEY))).circulation.slot_10,true);
 restoreImport(s,'progress');assert.deepEqual(readBase(JSON.parse(s.getItem(BASE_KEY))).circulation,base1.circulation);
 assert.throws(()=>prepareBase({...first,circulation:{slot_10:true}},data.importedAt),/통로/);
 assert.throws(()=>prepareBase({...first,circulation:{...first.circulation,slot_10:1}},data.importedAt),/통로/);
 const legacy=readBase({version:2,rooms:{}});assert.equal(legacy.circulationIncluded,false);
 assert.equal(circulationBuilt(legacy,'slot_10'),false);
});

test('circulation renderer omits unbuilt passages and preserves empty elevator floor positions',async()=>{
 const vm=await import('node:vm');
 const {CIRCULATION_SLOTS,circulationBuilt}=await import('../assets/js/base-state.mjs');
 const source=readFileSync(new URL('../assets/js/base.mjs',import.meta.url),'utf8');
 const fn=source.slice(source.indexOf('function updateCirculation(){'),source.indexOf('function updateElevatorLinks()'));
 class Element{
  constructor(){this.children=[];this.dataset={};this.className='';this.attrs={};this.style={setProperty(){}};this.classList={add:n=>this.className+=' '+n};}
  append(...nodes){this.children.push(...nodes);}prepend(node){this.children.unshift(node);}setAttribute(k,v){this.attrs[k]=v;}
 }
 const map=new Element();const document={querySelector:()=>null,createElement:()=>new Element(),getElementById:()=>map};
 const settings=prepareBase(normalizeBuilding({roomSlots:{slot_10:{roomId:'CORRIDOR',level:1},slot_8:{roomId:'ELEVATOR',level:1}}}),data.importedAt);
 vm.runInNewContext(fn+'updateCirculation();',{document,settings,CIRCULATION_SLOTS,circulationBuilt});
 const container=map.children[0],passages=container.children.filter(n=>n.className.startsWith('passage '));
 assert.deepEqual(passages.map(p=>p.dataset.slotId),['slot_10']);
 const floors=container.children.filter(n=>n.className.startsWith('elevator ')).flatMap(n=>n.children);
 assert.equal(floors.length,16);
 assert.equal(floors.filter(n=>!n.className.includes('circulation-empty')).length,1);
 assert.equal(floors.find(n=>n.dataset.slotId==='slot_8').dataset.floor,'4');
});

test('elevator connections skip unbuilt rooms and hidden landings',async()=>{
 const vm=await import('node:vm');
 const source=readFileSync(new URL('../assets/js/base.mjs',import.meta.url),'utf8');
 const fn=source.slice(source.indexOf('function updateElevatorLinks(){'),source.indexOf('updateElevatorLinks();new ResizeObserver'));
 function el(classes,rect){return {classList:{contains:c=>classes.includes(c)},dataset:{},clientWidth:40,getBoundingClientRect:()=>rect};}
 const elevator=el(['elevator-landing'],{left:0,right:40,top:80,bottom:160});
 const unbuiltRoom=el(['room','room-empty'],{left:40,right:120,top:80,bottom:160});
 const hiddenLanding=el(['elevator-landing','circulation-empty'],{left:0,right:40,top:160,bottom:240});
 const upstairs=el(['room'],{left:0,right:40,top:0,bottom:80});
 const nodes=[elevator,unbuiltRoom,hiddenLanding,upstairs];
 const document={querySelectorAll:selector=>nodes.filter(n=>!(n.classList.contains('room-empty')&&selector.includes('.room:not(.room-empty)'))&&!(n.classList.contains('circulation-empty')&&selector.includes('.elevator-landing:not(.circulation-empty)')))};
 vm.runInNewContext(fn+'updateElevatorLinks();',{document,updateRegionCorners(){}});
 assert.equal(elevator.dataset.connections,'up');
 assert.equal(hiddenLanding.dataset.connections,undefined);
});

test('uncleared and cleaned-but-unbuilt facility slots remain empty after account import',async()=>{
 const raw={roomSlots:{
  slot_24:{roomId:'',level:0,charInstIds:[]},
  slot_25:{roomId:'MANUFACTURE',level:0,charInstIds:[]},
  slot_26:{roomId:'POWER',level:1,charInstIds:[-1]},
  slot_47:{roomId:'PRIVATE',level:0,charInstIds:[]}
 },rooms:{PRIVATE:{slot_47:{owners:[]}}}};
 const base=readBase(prepareBase(normalizeBuilding(raw),data.importedAt));
 assert.equal(base.rooms.slot_24,undefined);
 assert.equal(base.rooms.slot_25.level,0);assert.equal(base.rooms.slot_47.level,0);
 assert.equal(base.rooms.slot_26.level,1);
 const vm=await import('node:vm'),{FACILITIES}=await import('../assets/js/base-state.mjs');
 const source=readFileSync(new URL('../assets/js/base.mjs',import.meta.url),'utf8');
 const functions=source.slice(source.indexOf('function room('),source.indexOf('function render(){'));
 class Element{constructor(){this.classes=[];this.attrs={};this.classList={add:c=>this.classes.push(c)};}setAttribute(k,v){this.attrs[k]=v;}}
 const document={createElement:()=>new Element()};
 const context={document,FACILITIES};vm.createContext(context);vm.runInContext(functions,context);
 for(const [id,type] of [['slot_24','TRADING'],['slot_25','MANUFACTURE'],['slot_47','PRIVATE']]){
  const card=type==='PRIVATE'?context.privateRoom(id,'활동실',base.rooms[id]):context.room(id,type,FACILITIES[type].name,base.rooms[id]);
  assert.equal(card.attrs['aria-hidden'],'true');assert.ok(card.classes.includes('room-empty'));
  assert.equal(card.innerHTML,undefined);
 }
});

test('unlinked base starts with only level-one control center; imported rooms stay intact',()=>{
 for(const raw of [null,undefined,{}]){
  const base=readBase(raw);
  assert.deepEqual(Object.entries(base.rooms).filter(([,r])=>r.level>0).map(([id,r])=>[id,r.type,r.level,r.count]),[['slot_34','CONTROL',1,0]]);
 }
 const imported={version:2,source:'account',rooms:{slot_34:{type:'CONTROL',level:5,count:0,operators:[]},slot_25:{type:'MANUFACTURE',level:3,count:0,operators:[]}}};
 assert.deepEqual(readBase(imported).rooms,imported.rooms);
});

import {createBaseAccountAdapter} from '../assets/js/base-account-adapter.mjs';
test('base-page import adapter preserves latest state and notifies without navigating',async t=>{
 t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({operators:chars})}));
 const storage=new Map();storage.getItem=k=>storage.get(k)??null;
 let notified=0;// Event dispatch is provided by window in the page.
 const previousWindow=globalThis.window;globalThis.window={dispatchEvent:e=>{assert.equal(e.type,'account-import-applied');notified++;}};
 try{
  const adapter=await createBaseAccountAdapter(storage);assert.ok(adapter.chars.length);assert.equal(adapter.key,'arknightsOperatorProgressV1');
  storage.set(adapter.key,JSON.stringify({[op.id]:{owned:true,custom:'keep'}}));
  assert.equal(adapter.state[op.id].custom,'keep');
  const preview=prepareImport(data,adapter.chars,adapter.state,frames);
  assert.equal(preview.state[op.id].custom,'keep');adapter.replace(preview.state);assert.equal(notified,1);
  storage.set(adapter.key,'broken');assert.throws(()=>adapter.state,/육성 정보/);
 }finally{if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;}
});
test('base page opens its own complete account dialog',()=>{
 const html=readFileSync(new URL('../base.html',import.meta.url),'utf8');
 assert.match(html,/<button[^>]*id="gameImport"/);assert.doesNotMatch(html,/<a[^>]*href="operators.html"[^>]*>게임 계정 가져오기/);
 for(const id of ['accountDialog','accountForm','accountEmail','accountCode','accountSend','accountFetch','accountApply','accountUndo','accountClose'])assert.ok(html.includes(`id="${id}"`));
 assert.ok(html.includes('account-import.mjs?v=10'));
});
