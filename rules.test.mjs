import test from "node:test";
import assert from "node:assert/strict";
import {
  applyRuleTransfer,
  applyRuleMove,
  canRuleTransfer,
  canRuleMove,
  initialRuleProgress,
  legalRuleTransfers,
  legalRuleMoves,
  validRuleProgress,
  validRules,
} from "./rules.js";
import { holding, tube } from "./engine.js";

const state = (tubes, capacity = 2, held = []) => ({
  capacity,
  tubes: tubes.map((tube) => [...tube]),
  hidden: tubes.map((tube) => tube.map(() => false)),
  holding: [...held],
});

test("sealed tubes cannot send to or receive from holding", () => {
  const rules = { goalColor: null, marked: [], sealedLane: 0, unlockColor: 0 };
  const progress = initialRuleProgress(rules);
  const board = state([[0], []], 2, [1, null]);

  assert.deepEqual(
    canRuleTransfer(board, tube(0), holding(1), rules, progress),
    { allowed: false, reason: "sealed" },
  );
  assert.deepEqual(
    canRuleTransfer(board, holding(0), tube(0), rules, progress),
    { allowed: false, reason: "sealed" },
  );
  assert.deepEqual(
    canRuleTransfer(board, holding(0), tube(1), rules, progress),
    { allowed: true, reason: null },
  );
  assert.equal(
    legalRuleTransfers(board, rules, progress).some(({ from, to }) =>
      from.kind === "holding" && from.index === 0 &&
      to.kind === "tube" && to.index === 0),
    false,
  );
});

test("marked tubes reject the wrong held pet", () => {
  const rules = {
    goalColor: null,
    marked: [{ lane: 1, color: 0 }],
    sealedLane: null,
    unlockColor: null,
  };
  const progress = initialRuleProgress(rules);
  const board = state([[], []], 2, [1]);

  assert.deepEqual(
    canRuleTransfer(board, holding(0), tube(1), rules, progress),
    { allowed: false, reason: "marked-color" },
  );
  const leavingForHolding = state([[1], []], 2, [null, null]);
  assert.deepEqual(
    canRuleTransfer(leavingForHolding, tube(0), holding(1), rules, progress),
    { allowed: true, reason: null },
  );
});

test("a held goal pet can complete its tube and open the seal", () => {
  const rules = { goalColor: 0, marked: [], sealedLane: 2, unlockColor: 0 };
  const progress = initialRuleProgress(rules);
  const board = state([[0], [1, 1], []], 2, [0]);

  const completed = applyRuleTransfer(
    board,
    holding(0),
    tube(0),
    rules,
    progress,
  );
  assert.deepEqual(completed.progress, { goalAchieved: true, sealOpened: true });
  assert.equal(completed.completedColor, 0);
  assert.deepEqual(completed.state.tubes[0], [0, 0]);
  assert.deepEqual(completed.state.holding, [null]);
});

test("a held non-goal pet cannot complete before the goal", () => {
  const rules = { goalColor: 0, marked: [], sealedLane: null, unlockColor: null };
  const progress = initialRuleProgress(rules);
  const board = state([[1], [0]], 2, [1]);

  assert.deepEqual(
    canRuleTransfer(board, holding(0), tube(0), rules, progress),
    { allowed: false, reason: "goal-first" },
  );
  assert.equal(
    applyRuleTransfer(board, holding(0), tube(0), rules, progress),
    null,
  );
});

test("ordinary mixed-color moves use the base movement rules", () => {
  const board = state([[1, 0], [2], []], 3);
  const rules = { goalColor: null, marked: [], sealedLane: null, unlockColor: null };
  const progress = initialRuleProgress(rules);
  assert.deepEqual(progress, { goalAchieved: true, sealOpened: true });
  assert.equal(canRuleMove(board, 0, 1, rules, progress).allowed, true);
  assert.equal(applyRuleMove(board, 0, 1, rules, progress).state.tubes[1].at(-1), 0);
  assert.ok(legalRuleMoves(board, rules, progress).some(({ from, to }) => from === 0 && to === 1));
});

test("goal must be the first completed color", () => {
  const rules = { goalColor: 0, marked: [], sealedLane: null, unlockColor: null };
  const progress = initialRuleProgress(rules);
  const beforeOther = state([[1], [1], [0], [0], []]);
  assert.equal(canRuleMove(beforeOther, 0, 1, rules, progress).allowed, false);
  assert.equal(canRuleMove(beforeOther, 0, 1, rules, progress).reason, "goal-first");

  const beforeGoal = state([[0], [0], [1], [1], []]);
  const goal = applyRuleMove(beforeGoal, 0, 1, rules, progress);
  assert.equal(goal.completedColor, 0);
  assert.equal(goal.progress.goalAchieved, true);
  assert.equal(canRuleMove(goal.state, 2, 3, rules, goal.progress).allowed, true);
});

test("marked lanes accept only their pet while existing occupants can leave", () => {
  const rules = { goalColor: null, marked: [{ lane: 2, color: 0 }], sealedLane: null, unlockColor: null };
  const progress = initialRuleProgress(rules);
  const board = state([[1], [0], []]);
  assert.equal(canRuleMove(board, 0, 2, rules, progress).allowed, false);
  assert.equal(canRuleMove(board, 0, 2, rules, progress).reason, "marked-color");
  assert.equal(canRuleMove(board, 1, 2, rules, progress).allowed, true);
  const occupied = state([[], [0], [1]]);
  assert.equal(canRuleMove(occupied, 2, 0, rules, progress).allowed, true);
});

test("sealed lanes block source and destination until their pet completes", () => {
  const rules = { goalColor: null, marked: [], sealedLane: 3, unlockColor: 0 };
  const progress = initialRuleProgress(rules);
  const board = state([[0], [1], [0], [2], []]);
  assert.equal(canRuleMove(board, 3, 4, rules, progress).allowed, false);
  assert.equal(canRuleMove(board, 1, 3, rules, progress).allowed, false);
  assert.equal(canRuleMove(board, 3, 4, rules, progress).reason, "sealed");
  const unlocked = applyRuleMove(board, 0, 2, rules, progress);
  assert.equal(unlocked.progress.sealOpened, true);
  assert.equal(canRuleMove(unlocked.state, 3, 4, rules, unlocked.progress).allowed, true);
});

test("one completion opens combined goal and seal exactly once and never relocks", () => {
  const rules = { goalColor: 0, marked: [], sealedLane: 3, unlockColor: 0 };
  const before = state([[0], [0], [1], [2], []]);
  const progress = initialRuleProgress(rules);
  const completed = applyRuleMove(before, 0, 1, rules, progress);
  assert.deepEqual(completed.progress, { goalAchieved: true, sealOpened: true });
  assert.deepEqual(completed.state.tubes.map((tube) => tube.length), [0, 2, 1, 1, 0]);
  assert.equal(completed.completedColor, 0);

  const disturbed = applyRuleMove(completed.state, 1, 4, rules, completed.progress);
  assert.deepEqual(disturbed.progress, { goalAchieved: true, sealOpened: true });
  assert.equal(canRuleMove(disturbed.state, 3, 0, rules, disturbed.progress).allowed, true);
});

test("rule and progress validation reject out-of-range or inconsistent data", () => {
  const config = { colors: 4, blanks: 2 };
  const valid = { goalColor: 0, marked: [{ lane: 4, color: 1 }], sealedLane: 5, unlockColor: 0 };
  assert.equal(validRules(valid, config), true);
  assert.equal(validRules({ ...valid, sealedLane: 6 }, config), false);
  assert.equal(validRules({ ...valid, marked: [{ lane: 4, color: 9 }] }, config), false);
  assert.equal(validRules({ ...valid, unlockColor: 2 }, config), false);
  assert.equal(validRuleProgress({ goalAchieved: false, sealOpened: false }, valid), true);
  assert.equal(validRuleProgress({ goalAchieved: "no", sealOpened: false }, valid), false);
});
