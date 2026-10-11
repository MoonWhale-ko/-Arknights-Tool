export const INVENTORY_KEY = "arknightsInventoryV1";
export const BACKUP_KEY = "arknightsAccountImportBackupV1";
const CLASS_VARIANTS = {char_1001_amiya2:"char_002_amiya",char_1037_amiya3:"char_002_amiya"};
const object = (v) => v && typeof v === "object" && !Array.isArray(v);
const integer = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
export function trustPercent(points, frames) {
  if (!integer(points, 0, Number.MAX_SAFE_INTEGER))
    throw new Error("신뢰도 데이터 형식이 올바르지 않습니다.");
  const frame = frames.find((f) => f.points >= points);
  return frame?.percent ?? 200;
}
export function prepareImport(data, chars, previous, frames, characters = {}) {
  if (
    data?.version !== 1 ||
    data.server !== "kr" ||
    !Array.isArray(data.operators) ||
    !data.operators.length ||
    !object(data.inventory)
  )
    throw new Error("가져온 데이터 형식이 올바르지 않습니다.");
  const byId = new Map(chars.map((c) => [c.id, c])),
    next = structuredClone(previous),
    seen = new Set();
  let skipped = 0;
  const skippedOperators = [];
  const classVariants = [];
  for (const op of data.operators) {
    if (!object(op) || typeof op.id !== "string" || seen.has(op.id))
      throw new Error("오퍼레이터 데이터가 중복되거나 잘못되었습니다.");
    seen.add(op.id);
    const baseId = Object.hasOwn(CLASS_VARIANTS,op.id) ? CLASS_VARIANTS[op.id] : null;
    if (baseId && byId.has(baseId)) {
      const base = byId.get(baseId);
      if (!integer(op.elite,0,base.phases.length-1) || !integer(op.level,1,base.phases[op.elite].maxLevel) || !integer(op.potential,1,(base.maxPotentialLevel??5)+1) || !integer(op.skill,1,7) || !Array.isArray(op.skills) || !object(op.modules) || op.skills.some(s=>!object(s)||typeof s.id!=="string"||!integer(s.mastery,0,3)) || Object.values(op.modules).some(v=>!integer(v,0,3)))
        throw new Error("직군 전환 육성 데이터 형식이 올바르지 않습니다.");
      trustPercent(op.favorPoint,frames);
      classVariants.push({baseId,op});
      continue;
    }
    const c = byId.get(op.id);
    if (!c) {
      skipped++;
      const info = Object.hasOwn(characters,op.id) ? characters[op.id] : null;
      skippedOperators.push({id:op.id,name:typeof info?.name === "string" ? info.name : null,obtainable:typeof info?.obtainable === "boolean" ? info.obtainable : null});
      continue;
    }
    if (
      !integer(op.elite, 0, c.phases.length - 1) ||
      !integer(op.level, 1, c.phases[op.elite].maxLevel) ||
      !integer(op.potential, 1, (c.maxPotentialLevel ?? 5) + 1) ||
      !integer(op.skill, 1, 7) ||
      !Array.isArray(op.skills) ||
      !object(op.modules)
    )
      throw new Error("육성 데이터 형식이 올바르지 않습니다.");
    const skills = new Map(op.skills.map((s) => [s.id, s.mastery]));
    const m = c.skills.map((sk) => {
      const level = skills.get(sk.id) ?? 0;
      if (!integer(level, 0, 3))
        throw new Error("마스터리 데이터 형식이 올바르지 않습니다.");
      return level;
    });
    while (m.length < 3) m.push(0);
    // IDs take priority over old type keys. Reset all supported modules to actual account stages.
    const mods = { ...(object(next[c.id]?.mods) ? next[c.id].mods : {}) };
    for (const mod of c.modules) {
      const stage = op.modules[mod.id] ?? 0;
      if (!integer(stage, 0, 3))
        throw new Error("모듈 데이터 형식이 올바르지 않습니다.");
      mods[mod.id] = stage;
    }
    next[c.id] = {
      ...(object(next[c.id]) ? next[c.id] : {}),
      owned: true,
      elite: op.elite,
      level: op.level,
      potential: op.potential,
      trust: trustPercent(op.favorPoint, frames),
      skill: op.skill,
      m,
      mods,
    };
  }
  for (const {baseId,op} of classVariants) {
    if (!seen.has(baseId)) throw new Error("직군 전환의 기본 오퍼레이터 데이터가 없습니다. 다시 조회해 주세요.");
    next[baseId].classVariants = {...(object(next[baseId].classVariants)?next[baseId].classVariants:{}),[op.id]:structuredClone(op)};
  }
  if (![...seen].some((id) => byId.has(id)))
    throw new Error("사이트에 연결할 수 있는 오퍼레이터가 없습니다.");
  // A complete successful snapshot is authoritative for ownership, not custom goals/settings.
  for (const c of chars)
    if (!seen.has(c.id) && object(next[c.id])) next[c.id].owned = false;
  const items = {};
  for (const [id, count] of Object.entries(data.inventory)) {
    if (
      !integer(count, 0, Number.MAX_SAFE_INTEGER) ||
      id === "__proto__" ||
      id === "constructor" ||
      id === "prototype"
    )
      throw new Error("재료 데이터 형식이 올바르지 않습니다.");
    items[id] = count;
  }
  return {
    state: next,
    inventory: { version: 1, server: "kr", importedAt: data.importedAt, items },
    owned: data.operators.length - skipped - classVariants.length,
    classVariantCount: classVariants.length,
    skipped,
    skippedOperators,
  };
}
export function commitImport(storage, progressKey, prepared) {
  const progress = storage.getItem(progressKey),
    inventory = storage.getItem(INVENTORY_KEY);
  storage.setItem(
    BACKUP_KEY,
    JSON.stringify({
      version: 1,
      savedAt: new Date().toISOString(),
      progress,
      inventory,
    }),
  );
  try {
    storage.setItem(INVENTORY_KEY, JSON.stringify(prepared.inventory));
    storage.setItem(progressKey, JSON.stringify(prepared.state));
  } catch (e) {
    if (inventory === null) storage.removeItem(INVENTORY_KEY);
    else storage.setItem(INVENTORY_KEY, inventory);
    if (progress === null) storage.removeItem(progressKey);
    else storage.setItem(progressKey, progress);
    throw e;
  }
}
export function restoreImport(storage, progressKey) {
  const backup = JSON.parse(storage.getItem(BACKUP_KEY) || "null");
  if (
    backup?.version !== 1 ||
    !(backup.progress === null || typeof backup.progress === "string") ||
    !(backup.inventory === null || typeof backup.inventory === "string")
  )
    throw new Error("가져오기 전 백업이 없습니다.");
  const oldProgress = storage.getItem(progressKey),
    oldInventory = storage.getItem(INVENTORY_KEY);
  try {
    for (const [key, value] of [
      [progressKey, backup.progress],
      [INVENTORY_KEY, backup.inventory],
    ])
      value === null ? storage.removeItem(key) : storage.setItem(key, value);
  } catch (e) {
    for (const [key, value] of [
      [progressKey, oldProgress],
      [INVENTORY_KEY, oldInventory],
    ])
      value === null ? storage.removeItem(key) : storage.setItem(key, value);
    throw e;
  }
  return JSON.parse(backup.progress || "{}");
}
