import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  makeMoveSnapshot,
  restoreMoveSnapshot,
  startGeneratedLevel,
} from "./game-state.js";
import { LevelGenerationError } from "./level-generator.js";

const current = Object.freeze({
  mode: "blind",
  round: 7,
  seed: 41,
  state: Object.freeze({ capacity: 2, tubes: Object.freeze([Object.freeze([0]), Object.freeze([])]), hidden: Object.freeze([Object.freeze([false]), Object.freeze([])]) }),
});

test("move snapshots clone and restore rule progress with the board", () => {
  const input = {
    state: { capacity: 2, tubes: [[0], []], hidden: [[false], []], holding: [1, null] },
    moves: 9,
    holdingBoosted: true,
    ruleProgress: { goalAchieved: true, sealOpened: false },
  };
  const snapshot = makeMoveSnapshot(input);
  input.state.tubes[0].pop();
  input.state.holding[0] = null;
  input.ruleProgress.sealOpened = true;
  const restored = restoreMoveSnapshot(snapshot);
  assert.deepEqual(restored.state.tubes, [[0], []]);
  assert.deepEqual(restored.state.holding, [1, null]);
  assert.equal(restored.holdingBoosted, true);
  assert.equal(Object.hasOwn(restored, "extra"), false);
  assert.deepEqual(restored.ruleProgress, { goalAchieved: true, sealOpened: false });
  restored.state.tubes[0].pop();
  restored.state.holding[0] = null;
  assert.deepEqual(snapshot.state.tubes, [[0], []]);
  assert.deepEqual(snapshot.state.holding, [1, null]);
});

test("generation success keeps the resolved seed and fresh rule state", () => {
  const request = { mode: "blind", seed: 5, round: 20, rule: "timed" };
  const level = {
    seed: 8,
    state: { capacity: 1, tubes: [[0], []], hidden: [[false], []] },
    rules: { goalColor: 0, marked: [], sealedLane: null, unlockColor: null },
    progress: { goalAchieved: false, sealOpened: true },
    solution: [],
  };
  const result = startGeneratedLevel(current, request, () => level);
  assert.equal(result.ok, true);
  assert.equal(result.next.seed, 8);
  assert.equal(result.next.rule, "timed");
  assert.deepEqual(result.next.ruleProgress, level.progress);
  assert.notEqual(result.next.state, level.state);
});

test("generation failure preserves the current playable board", () => {
  const request = { mode: "blind", seed: 7, round: 20, rule: "moves" };
  const result = startGeneratedLevel(current, request, () => {
    throw new LevelGenerationError("blind", 20, 7);
  });
  assert.equal(result.ok, false);
  assert.equal(result.current, current);
  assert.ok(result.error instanceof LevelGenerationError);
});

test("tap, drag, deadlock and generated replay share the rule engine", async () => {
  const source = await readFile("game.js", "utf8");
  assert.match(source, /from "\.\/rules\.js/);
  assert.match(source, /canRuleMove\(state, selected, i, rules, ruleProgress\)/);
  assert.match(source, /applyRuleMove\(state, from, i, rules, ruleProgress\)/);
  assert.match(source, /legalRuleMoves\(state, rules, ruleProgress\)/);
  assert.match(source, /canDrop:\s*\(from, to\) =>\s*canRuleMove/);
  assert.doesNotMatch(source, /canDrop:[^\n]*canPour/);
});
