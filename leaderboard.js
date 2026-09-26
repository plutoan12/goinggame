import { isWin, levelConfig } from "./engine.js";

export const RANK_VERSION = "twelve-puzzle-rules-v1";
export const RANK_KEY = "twelve-puzzle-rankings-v1";
const MAX_RECORDS = 200;

export function cleanName(value) {
  return (
    Array.from(
      String(value ?? "")
        .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, "")
        .trim(),
    )
      .slice(0, 12)
      .join("") || "나"
  );
}
export function makeRecord({
  id,
  name,
  mode,
  seed,
  round,
  state,
  moves,
  extra,
  run,
  now = Date.now(),
}) {
  if (mode !== "blind" || !isWin(state) || !Number.isInteger(round) || round < 1 || round > 20) return null;
  const used =
    Math.max(0, 3 + (run.rewards.undo ? 3 : 0) - run.undo) +
    Math.max(0, 2 + (run.rewards.peek ? 2 : 0) - run.peek) +
    Number(extra) +
    Number(run.revived);
  const record = {
    id,
    name: cleanName(name),
    rulesVersion: RANK_VERSION,
    stage: levelConfig(mode, round).tier,
    seed: seed >>> 0,
    rule: run.rule,
    moves,
    elapsedMs:
      run.rule === "timed"
        ? Math.round(
            Math.max(
              0,
              run.timeLimitMs + (run.revived ? 60000 : 0) - run.remainingMs,
            ) / 100,
          ) * 100
        : null,
    assisted: used > 0,
    itemsUsed: used,
    createdAt: now,
  };
  return validRecord(record) ? record : null;
}
export function validRecord(r) {
  return (
    !!r &&
    typeof r.id === "string" &&
    /^[a-zA-Z0-9-]{1,80}$/.test(r.id) &&
    typeof r.name === "string" &&
    r.name === cleanName(r.name) &&
    r.rulesVersion === RANK_VERSION &&
    Number.isInteger(r.stage) &&
    r.stage >= 1 &&
    r.stage <= 20 &&
    Number.isInteger(r.seed) &&
    r.seed >= 0 &&
    r.seed <= 0xffffffff &&
    ["moves", "timed"].includes(r.rule) &&
    Number.isSafeInteger(r.moves) &&
    r.moves >= 0 &&
    (r.rule === "moves"
      ? r.elapsedMs === null
      : Number.isSafeInteger(r.elapsedMs) && r.elapsedMs >= 0) &&
    typeof r.assisted === "boolean" &&
    Number.isInteger(r.itemsUsed) &&
    r.itemsUsed >= 0 &&
    r.itemsUsed <= 12 &&
    r.assisted === r.itemsUsed > 0 &&
    Number.isSafeInteger(r.createdAt) &&
    r.createdAt >= 0
  );
}
export function addRecord(records, record) {
  if (!validRecord(record) || records.some((r) => r.id === record.id))
    return records;
  // Insertion order keeps the newest completion even if the device clock changes.
  return [record, ...records].slice(0, MAX_RECORDS);
}
export function rankRecords(records, { stage, rule, assisted, seed = null }) {
  const score = (r) => (rule === "timed" ? r.elapsedMs : r.moves);
  const sorted = records
    .filter(
      (r) =>
        validRecord(r) &&
        r.stage === stage &&
        r.rule === rule &&
        r.assisted === assisted &&
        (seed === null || r.seed === seed),
    )
    .sort(
      (a, b) =>
        score(a) - score(b) ||
        a.createdAt - b.createdAt ||
        a.id.localeCompare(b.id),
    );
  let rank = 0;
  return sorted.map((r, i) => {
    if (!i || score(r) !== score(sorted[i - 1])) rank = i + 1;
    return { ...r, rank };
  });
}
export function scoreLabel(record) {
  if (record.rule === "moves") return `${record.moves}수`;
  const tenths = Math.round(record.elapsedMs / 100);
  return `${Math.floor(tenths / 600)}:${String(Math.floor(tenths / 10) % 60).padStart(2, "0")}.${tenths % 10}`;
}
export function createLeaderboard(storage) {
  let records = [],
    name = "나",
    storageError = false;
  try {
    const value = JSON.parse(storage.getItem(RANK_KEY));
    if (value) {
      name = cleanName(value.name);
      if (Array.isArray(value.records)) {
        const ids = new Set();
        records = value.records
          .filter((r) => validRecord(r) && !ids.has(r.id) && ids.add(r.id))
          .slice(0, MAX_RECORDS);
      }
    }
  } catch {
    storageError = true;
  }
  const persist = () => {
    try {
      storage.setItem(RANK_KEY, JSON.stringify({ name, records }));
      storageError = false;
    } catch {
      storageError = true;
    }
  };
  return {
    get name() {
      return name;
    },
    get records() {
      return structuredClone(records);
    },
    get storageError() {
      return storageError;
    },
    rename(value) {
      name = cleanName(value);
      persist();
      return name;
    },
    submit(record) {
      const next = addRecord(records, record);
      if (next !== records) {
        records = next;
        persist();
      }
      return !storageError;
    },
  };
}
