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
