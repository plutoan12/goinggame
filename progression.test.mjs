import test from "node:test";
import assert from "node:assert/strict";
import { createProgression, PROGRESS_KEY } from "./progression.js";
import { levelConfig } from "./stage-config.js";
const won = { capacity: 2, tubes: [[0, 0], [1, 1], []] };
const playing = { capacity: 2, tubes: [[0, 1], [1, 0], []] };
function memory() {
  const map = new Map();
  return { getItem: (k) => map.get(k) || null, setItem: (k, v) => map.set(k, v) };
}
test("fresh install exposes only intro, and neither losses nor skipped stages unlock", () => {
  assert.equal(PROGRESS_KEY, "twelve-puzzle-progress-v1");
  const p = createProgression(memory());
  assert.equal(p.canAccess(1), true);
  for (const stage of [0, 2, 3, 4, 5, 6, NaN, 1.5]) assert.equal(p.canAccess(stage), false);
  assert.equal(p.complete(1, playing), false);
  assert.equal(p.complete(2, won), false);
  assert.equal(p.unlocked, 1);
});
test("progression never reads or mutates previous game keys", () => {
  const calls = [];
  const storage = {
    getItem(key) { calls.push(["get", key]); return null; },
    setItem(key) { calls.push(["set", key]); },
    removeItem(key) { calls.push(["remove", key]); },
  };
  const p = createProgression(storage);
  assert.equal(p.complete(1, won), true);
  assert.deepEqual(calls.map(([, key]) => key), [PROGRESS_KEY, PROGRESS_KEY]);
  assert.equal(calls.some(([, key]) => key.startsWith("twelve-guardians-")), false);
});
test("wins unlock one stage at a time, preserve replays and survive reopening", () => {
  const storage = memory();
  let p = createProgression(storage);
  for (let stage = 1; stage <= 20; stage++) {
    assert.equal(p.complete(stage, won), true);
    assert.equal(p.complete(stage, won), false);
    p = createProgression(storage);
    assert.equal(p.cleared, stage);
    assert.equal(p.unlocked, Math.min(20, stage + 1));
    assert.equal(p.canAccess(1), true);
  }
  assert.equal(levelConfig("blind", 99).tier, 20);
  assert.equal(p.canAccess(21), false);
  assert.equal(p.canAccess(99), false);
  assert.equal(p.complete(21, won), false);
  assert.equal(p.complete(99, won), false);
});
test("corrupt or incompatible progress cannot unlock all stages", () => {
  for (const value of ["{", "null", '{"version":1,"cleared":-1}', '{"version":1,"cleared":21}',
    '{"version":1,"cleared":99}', '{"version":1,"cleared":1.5}', '{"version":2,"cleared":20}']) {
    const storage = memory(); storage.setItem(PROGRESS_KEY, value);
    assert.equal(createProgression(storage).unlocked, 1);
  }
});
test("storage failure retains this session's progress and reports the failure", () => {
  const p = createProgression({ getItem() { throw Error(); }, setItem() { throw Error(); } });
  assert.equal(p.storageError, true);
  assert.equal(p.complete(1, won), true);
  assert.equal(p.unlocked, 2);
  assert.equal(p.storageError, true);
});
