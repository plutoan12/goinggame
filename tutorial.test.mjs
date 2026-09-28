import test from "node:test";
import assert from "node:assert/strict";
import { createTutorial, TUTORIAL_KEY } from "./tutorial.js";
import { holding, isWin, tube } from "./engine.js";
import { createProgression, PROGRESS_KEY } from "./progression.js";

const memory = () => {
  const data = new Map();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), data };
};
const STEPS = [
  [tube(0), holding(0)],
  [tube(1), tube(0)],
  [holding(0), tube(1)],
];
const solve = (t) => STEPS.forEach(([from, to]) => assert.equal(t.move(from, to), true));

test("guided moves reject wrong targets without changing the board or advancing", () => {
  assert.equal(TUTORIAL_KEY, "twelve-puzzle-tutorial-v2");
  const t = createTutorial(memory());
  const before = t.state;
  assert.equal(isWin(before), false);
  for (const [from, to] of [
    [tube(0), tube(0)],
    [tube(0), tube(1)],
    [tube(0), holding(1)],
    [tube(1), holding(0)],
    [holding(0), tube(1)],
  ]) {
    assert.equal(t.move(from, to), false);
    assert.deepEqual(t.state, before);
    assert.deepEqual(t.guide, { from: tube(0), to: holding(0) });
  }
  assert.equal(t.completed, false);
  assert.equal(t.move(tube(0), holding(0)), true);
  assert.deepEqual(t.state.tubes, [[0, 0], [1, 1, 0], [], []]);
  assert.deepEqual(t.state.holding, [1]);
  assert.deepEqual(t.guide, { from: tube(1), to: tube(0) });
});
test("tutorial storage is isolated from previous app keys", () => {
  const calls = [];
  const storage = {
    getItem(key) { calls.push(["get", key]); return null; },
    setItem(key) { calls.push(["set", key]); },
    removeItem(key) { calls.push(["remove", key]); },
  };
  const tutorial = createTutorial(storage);
  solve(tutorial);
  assert.deepEqual(calls.map(([, key]) => key), [TUTORIAL_KEY, TUTORIAL_KEY]);
  assert.equal(calls.some(([, key]) => key.startsWith("twelve-guardians-")), false);
});

test("tube to holding, tube to tube and holding to tube finish with an empty tray", () => {
  const storage = memory();
  storage.setItem("twelve-guardians-limits-v5", "existing game");
  storage.setItem("twelve-guardians-rankings-v2", "existing ranking");
  const p = createProgression(storage);
  const t = createTutorial(storage);
  solve(t);
  assert.equal(isWin(t.state), true);
  assert.deepEqual(t.state.holding, [null]);
  assert.equal(t.done, true);
  assert.equal(t.guide, null);
  assert.equal(t.completed, true);
  assert.equal(t.move(tube(0), holding(0)), false);
  assert.equal(p.canAccess(2), false);
  assert.equal(storage.getItem(PROGRESS_KEY), null);
  assert.equal(storage.getItem("twelve-guardians-limits-v5"), "existing game");
  assert.equal(storage.getItem("twelve-guardians-rankings-v2"), "existing ranking");
  assert.equal(createTutorial(storage).completed, true);
});

test("replay resets only tutorial board and cannot mutate state through a snapshot", () => {
  const t = createTutorial(memory());
  solve(t);
  t.restart();
  assert.equal(t.completed, true);
  assert.equal(t.done, false);
  assert.equal(t.step, 0);
  const snapshot = t.state;
  snapshot.tubes[0].pop();
  assert.equal(t.state.tubes[0].length, 3);
  solve(t);
});

test("unfinished, stale, corrupt and unavailable storage never falsely mark completion", () => {
  for (const value of [
    null,
    "{",
    "true",
    '{"version":1,"completed":true}',
    '{"version":2,"completed":"true"}',
    '{"version":3,"completed":true}',
  ]) {
    const storage = memory();
    if (value) storage.setItem(TUTORIAL_KEY, value);
    const t = createTutorial(storage);
    assert.equal(t.completed, false);
    t.move(tube(0), holding(0));
    assert.equal(createTutorial(storage).completed, false);
  }
  const t = createTutorial({ getItem() { throw Error(); }, setItem() { throw Error(); } });
  solve(t);
  assert.equal(t.done, true);
  assert.equal(t.completed, true);
  assert.equal(t.storageError, true);
});
