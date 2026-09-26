import test from "node:test";
import assert from "node:assert/strict";
import {
  RANK_VERSION,
  cleanName,
  makeRecord,
  validRecord,
  addRecord,
  rankRecords,
  scoreLabel,
  createLeaderboard,
  RANK_KEY,
} from "./leaderboard.js";
import { createRun } from "./session.js";

const won = {
  capacity: 2,
  tubes: [[0, 0], [1, 1], []],
  hidden: [[false, false], [false, false], []],
};
const run = () => createRun({ state: won, solution: [] });
const entry = (overrides = {}) => ({
  id: "test-1",
  name: "나",
  rulesVersion: RANK_VERSION,
  stage: 1,
  seed: 42,
  rule: "moves",
  moves: 30,
  elapsedMs: null,
  assisted: false,
  itemsUsed: 0,
  createdAt: 1,
  ...overrides,
});
const filter = { stage: 1, rule: "moves", assisted: false, seed: 42 };
function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  };
}

test("only completed journey games become records; practice and unfinished games excluded", () => {
  const input = {
    id: "round-1",
    name: "우리",
    mode: "blind",
    seed: 42,
    round: 1,
    state: won,
    moves: 20,
    extra: false,
    run: run(),
    now: 1,
  };
  assert.ok(validRecord(makeRecord(input)));
  assert.equal(RANK_KEY, "twelve-puzzle-rankings-v1");
  assert.equal(makeRecord({ ...input, round: 20 })?.stage, 20);
  assert.equal(makeRecord({ ...input, round: 21 }), null);
  assert.equal(makeRecord({ ...input, mode: "practice" }), null);
  assert.equal(
    makeRecord({ ...input, state: { ...won, tubes: [[0, 1], [1, 0], []] } }),
    null,
  );
  assert.equal(makeRecord({ ...input, moves: NaN }), null);
});
test("rankings require the current rules version and never inspect old keys", () => {
  assert.equal(RANK_VERSION, "twelve-puzzle-rules-v1");
  assert.equal(validRecord(entry({ rulesVersion: "sort-short-start-v3" })), false);
  assert.equal(validRecord(entry({ stage: 20 })), true);
  assert.equal(validRecord(entry({ stage: 21 })), false);
  const calls = [];
  const storage = {
    getItem(key) { calls.push(["get", key]); return null; },
    setItem(key) { calls.push(["set", key]); },
    removeItem(key) { calls.push(["remove", key]); },
  };
  const board = createLeaderboard(storage);
  board.submit(entry());
  assert.deepEqual(calls.map(([, key]) => key), [RANK_KEY, RANK_KEY]);
  assert.equal(calls.some(([, key]) => key.startsWith("twelve-guardians-")), false);
});
test("ranking separates stage, mode, assistance and board; ties use competition ranks", () => {
  const entries = [
    entry(),
    entry({ id: "test-2", moves: 20 }),
    entry({ id: "test-3", moves: 20 }),
    entry({ id: "test-4", stage: 2 }),
    entry({ id: "test-5", seed: 5 }),
    entry({ id: "test-6", assisted: true, itemsUsed: 1 }),
    entry({ id: "test-7", rule: "timed", elapsedMs: 10 }),
  ];
  assert.deepEqual(
    rankRecords(entries, filter).map((r) => [r.id, r.rank]),
    [
      ["test-2", 1],
      ["test-3", 1],
      ["test-1", 3],
    ],
  );
  assert.equal(rankRecords(entries, { ...filter, seed: null }).length, 4);
  assert.equal(
    rankRecords(entries, { ...filter, assisted: true })[0].id,
    "test-6",
  );
});
test("timed ranking uses elapsed active time, includes earned extra time and rounds to tenths", () => {
  const timed = {
    ...run(),
    rule: "timed",
    clockStarted: true,
    timeLimitMs: 90000,
    remainingMs: 45249,
    revived: true,
  };
  const record = makeRecord({
    id: "timed-1",
    name: "나",
    mode: "blind",
    seed: 42,
    round: 1,
    state: won,
    moves: 200,
    extra: false,
    run: timed,
    now: 1,
  });
  assert.equal(record.elapsedMs, 104800);
  assert.equal(record.assisted, true);
  assert.equal(scoreLabel(record), "1:44.8");
  const faster = { ...record, id: "timed-2", elapsedMs: 20000, moves: 300 };
  assert.equal(
    rankRecords([record, faster], {
      ...filter,
      rule: "timed",
      assisted: true,
    })[0].id,
    "timed-2",
  );
});
test("item replenishment cannot hide item use; unused replenishment is not assistance", () => {
  const input = {
    id: "item-1",
    name: "나",
    mode: "blind",
    seed: 42,
    round: 1,
    state: won,
    moves: 20,
    extra: false,
    run: run(),
    now: 1,
  };
  assert.equal(
    makeRecord({
      ...input,
      run: { ...run(), undo: 5, rewards: { undo: true, peek: false } },
    }).itemsUsed,
    1,
  );
  assert.equal(
    makeRecord({
      ...input,
      run: { ...run(), undo: 6, rewards: { undo: true, peek: false } },
    }).assisted,
    false,
  );
  assert.equal(makeRecord({ ...input, extra: true }).assisted, true);
});
test("duplicate victory is idempotent across reload; new attempts remain independent", () => {
  const storage = memoryStorage();
  const first = createLeaderboard(storage);
  first.rename("수호대");
  first.submit(entry());
  const reloaded = createLeaderboard(storage);
  reloaded.submit(entry({ moves: 1 }));
  assert.equal(reloaded.records.length, 1);
  assert.equal(reloaded.records[0].moves, 30);
  assert.equal(reloaded.name, "수호대");
  reloaded.submit(entry({ id: "new-attempt" }));
  assert.equal(reloaded.records.length, 2);
});
test("bad storage and quota errors retain an honest in-memory fallback", () => {
  const store = createLeaderboard({
    getItem() {
      throw Error("private");
    },
    setItem() {
      throw Error("full");
    },
  });
  assert.equal(store.storageError, true);
  assert.equal(store.submit(entry()), false);
  assert.equal(store.records.length, 1);
  const corrupt = createLeaderboard({ getItem: () => "{broken", setItem() {} });
  assert.equal(corrupt.records.length, 0);
  assert.equal(corrupt.submit(entry()), true);
});
test("fresh rankings leave legacy storage untouched and do not import its profile", () => {
  const storage = memoryStorage();
  const old = JSON.stringify({ name: "수호대", records: [entry({ version: "sort-limits-v1" })] });
  storage.setItem("twelve-guardians-rankings-v1", old);
  const board = createLeaderboard(storage);
  assert.equal(board.name, "나");
  assert.deepEqual(board.records, []);
  board.submit(entry());
  assert.equal(createLeaderboard(storage).records.length, 1);
  assert.equal(storage.getItem("twelve-guardians-rankings-v1"), old);
  assert.equal(validRecord(entry({ rulesVersion: "sort-limits-v1" })), false);
});
test("sanitize names and reject invalid rows, retain latest 200 records", () => {
  assert.equal(cleanName("  \n고양이\u202e "), "고양이");
  assert.equal(cleanName(" "), "나");
  assert.equal(Array.from(cleanName("🐱".repeat(15))).length, 12);
  assert.equal(validRecord(entry({ elapsedMs: 2 })), false);
  assert.equal(validRecord(entry({ stage: 21 })), false);
  assert.equal(validRecord(entry({ moves: -1 })), false);
  let records = [];
  for (let i = 0; i < 205; i++)
    records = addRecord(records, entry({ id: `attempt-${i}`, createdAt: i }));
  assert.equal(records.length, 200);
  assert.equal(records[0].id, "attempt-204");
  assert.equal(
    records.some((r) => r.id === "attempt-0"),
    false,
  );
  assert.equal(addRecord(records, entry({ moves: -1 })), records);
});
test("new ranking storage does not compare or overwrite previous large-board scores", () => {
  const storage = memoryStorage();
  const old = JSON.stringify({ name: "나비", records: [entry({version: "sort-free-stack-v2"})] });
  storage.setItem("twelve-guardians-rankings-v2", old);
  const board = createLeaderboard(storage);
  assert.equal(board.name, "나");
  assert.deepEqual(board.records, []);
  assert.equal(validRecord(entry({rulesVersion: "sort-free-stack-v2"})), false);
  board.submit(entry());
  assert.equal(createLeaderboard(storage).records.length, 1);
  assert.equal(storage.getItem("twelve-guardians-rankings-v2"), old);
});
