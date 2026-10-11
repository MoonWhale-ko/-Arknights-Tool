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

test("Amiya guard and medic forms link to one operator without overwriting caster skills",()=>{
 const a=chars.find(c=>c.id==="char_002_amiya");
 const caster={...data.operators[0],id:a.id,level:80,skills:a.skills.map(s=>({id:s.id,mastery:2})),modules:{}};
 const guard={...caster,id:"char_1001_amiya2",skills:[{id:"guard-skill",mastery:3}],modules:{guard_module:1}};
 const medic={...caster,id:"char_1037_amiya3",skills:[{id:"medic-skill",mastery:1}],modules:{medic_module:2}};
 for(const operators of [[caster,guard,medic],[medic,guard,caster]]){
  const p=prepareImport({...data,operators},chars,{},frames);
  assert.equal(p.owned,1);assert.equal(p.skipped,0);assert.equal(p.classVariantCount,2);
  assert.equal(p.state[a.id].owned,true);assert.equal(p.state[a.id].m[0],2);
  assert.deepEqual(p.state[a.id].classVariants[guard.id].skills,guard.skills);
  assert.deepEqual(p.state[a.id].classVariants[medic.id].modules,medic.modules);
  assert.equal(p.state[guard.id],undefined);assert.equal(p.state[medic.id],undefined);
 }
 assert.throws(()=>prepareImport({...data,operators:[guard]},chars,{},frames),/基本|기본/);
 assert.throws(()=>prepareImport({...data,operators:[caster,{...medic,skills:[{id:"bad",mastery:4}]}]},chars,{},frames),/직군 전환/);
});
