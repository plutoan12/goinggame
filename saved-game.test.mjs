import test from "node:test";
import assert from "node:assert/strict";
import { compactSolution, generateLevel, replaySolution } from "./level-generator.js";
import { createRun } from "./session.js";
import {
  SAVE_KEY,
  validCompletionAudit,
  validSavedGame,
  validState,
} from "./saved-game.js";
import { levelConfig } from "./stage-config.js";
import { holding, tube } from "./engine.js";
import { applyRuleMove, applyRuleTransfer } from "./rules.js";

const auditMove = ({ from, to }) => ({
  type: "move",
  from: tube(from),
  to: tube(to),
});

function stageSave(mode, round, seed = 20260928, moves = 0) {
  const level = generateLevel(mode, seed, round);
  return {
    version: 3,
    mode,
    round,
    seed: level.seed,
    state: structuredClone(level.state),
    moves,
    holdingBoosted: false,
    attemptId: `stage-${round}-attempt`,
    rules: structuredClone(level.rules),
    ruleProgress: structuredClone(level.progress),
    run: createRun(level, "moves", round),
    audit: [],
    history: [],
  };
}

test("only the current sixty-stage save payload is accepted", () => {
  const saved = stageSave("blind", 21);
  assert.equal(SAVE_KEY, "twelve-puzzle-game-v4");
  assert.equal(validSavedGame(saved), true);
  assert.equal(validSavedGame({ ...saved, version: 2 }), false);
  assert.equal(validSavedGame({ ...saved, round: 61 }), false);
  assert.equal(validSavedGame({ ...saved, seed: -1 }), false);
  assert.equal(validSavedGame({ ...saved, ruleProgress: { goalAchieved: "yes", sealOpened: false } }), false);
  assert.equal(validSavedGame({ ...saved, rules: { ...saved.rules, sealedLane: 99 } }), false);
  assert.equal(validSavedGame({ ...saved, rules: { ...saved.rules, goalColor: 99 } }), false);
  assert.equal(validSavedGame({
    ...saved,
    rules: {
      goalColor: null,
      marked: [{ lane: 0, color: 0 }],
      sealedLane: null,
      unlockColor: null,
    },
  }), false);
  assert.equal(validSavedGame({ ...saved, history: [{ state: saved.state }] }), false);
  assert.equal(validSavedGame({ mode: "blind", round: 5, state: saved.state }), false);
});

test("a pet in holding and its location move snapshot are valid", () => {
  const before = stageSave("blind", 1);
  const after = structuredClone(before);
  const from = tube(after.state.tubes.findIndex((tubeState) => tubeState.length));
  const to = holding(0);
  const snapshot = {
    state: structuredClone(after.state),
    moves: 0,
    holdingBoosted: false,
    ruleProgress: structuredClone(after.ruleProgress),
  };
  const applied = applyRuleTransfer(
    after.state, from, to, after.rules, after.ruleProgress,
  );
  assert.ok(applied);
  after.state = applied.state;
  after.ruleProgress = applied.progress;
  after.moves = 1;
  after.audit.push({ type: "move", from, to });
  after.history = [snapshot];
  assert.equal(validSavedGame(after), true);
  assert.deepEqual(after.history[0].ruleProgress, before.ruleProgress);
  assert.equal(after.state.holding[0] !== null, true);
  assert.equal(validState(after.state, levelConfig("blind", 1)), true);

  const wrongFinalHolding = structuredClone(after);
  wrongFinalHolding.state.holding[1] = wrongFinalHolding.state.holding[0];
  wrongFinalHolding.state.holding[0] = null;
  assert.equal(validState(wrongFinalHolding.state, levelConfig("blind", 1)), true);
  assert.equal(validSavedGame(wrongFinalHolding), false);
});

test("board validation rejects malformed tubes, holding length and occupied count", () => {
  const saved = stageSave("blind", 1);
  const config = levelConfig(saved.mode, saved.round);
  assert.equal(validState(saved.state, config), true);
  const wrongColor = structuredClone(saved.state);
  wrongColor.tubes[0][0] = 99;
  assert.equal(validState(wrongColor, config), false);
  const hiddenTop = structuredClone(saved.state);
  const lane = hiddenTop.tubes.findIndex((tube) => tube.length);
  hiddenTop.hidden[lane][hiddenTop.hidden[lane].length - 1] = true;
  assert.equal(validState(hiddenTop, config), false);
  const missingLane = structuredClone(saved.state);
  missingLane.tubes.pop();
  missingLane.hidden.pop();
  assert.equal(validState(missingLane, config), false);
  const wrongHoldingLength = structuredClone(saved.state);
  wrongHoldingLength.holding.pop();
  assert.equal(validState(wrongHoldingLength, config), false);
  const extraPet = structuredClone(saved.state);
  extraPet.holding[0] = 0;
  assert.equal(validState(extraPet, config), false);
});

test("audit rejects invalid locations, holding-to-holding and a second holding item", () => {
  const saved = stageSave("blind", 1);
  assert.equal(validSavedGame({
    ...saved,
    audit: [{ type: "move", from: { kind: "tray", index: 0 }, to: tube(0) }],
  }), false);
  assert.equal(validSavedGame({
    ...saved,
    audit: [{ type: "move", from: tube(-1), to: tube(0) }],
  }), false);
  assert.equal(validSavedGame({
    ...saved,
    audit: [{ type: "move", from: holding(0), to: holding(1) }],
  }), false);

  const boosted = structuredClone(saved);
  boosted.state.holding.push(null);
  boosted.holdingBoosted = true;
  boosted.audit = [{ type: "holding-plus" }];
  assert.equal(validSavedGame(boosted), true);
  boosted.audit.push({ type: "holding-plus" });
  assert.equal(validSavedGame(boosted), false);
});

test("save validation rejects stage-inconsistent run, rules and progress", () => {
  const saved = stageSave("blind", 5);
  assert.equal(validSavedGame(saved), true);
  assert.equal(validSavedGame({
    ...saved,
    run: { ...saved.run, timeLimitMs: 1, remainingMs: 1 },
  }), false);
  assert.equal(validSavedGame({
    ...saved,
    run: { ...saved.run, limit: saved.run.limit + 1 },
  }), false);
  assert.equal(validSavedGame({
    ...saved,
    run: { ...saved.run, undo: 4 },
  }), false);
  assert.equal(validSavedGame({
    ...saved,
    run: { ...saved.run, remainingMs: saved.run.timeLimitMs + 1 },
  }), false);
  const otherGoal = (saved.rules.goalColor + 1) % levelConfig("blind", 5).colors;
  assert.equal(validSavedGame({
    ...saved,
    rules: { ...saved.rules, goalColor: otherGoal },
  }), false);
  assert.equal(validSavedGame({
    ...saved,
    moves: 0,
    ruleProgress: { ...saved.ruleProgress, goalAchieved: true },
  }), false);
});

test("save validation rejects hidden practice tiles and zero-move wins", () => {
  const practice = stageSave("practice", 5);
  const hiddenPractice = structuredClone(practice);
  const lane = hiddenPractice.state.tubes.findIndex((tube) => tube.length > 1);
  hiddenPractice.state.hidden[lane][0] = true;
  assert.equal(validState(hiddenPractice.state, levelConfig("practice", 5)), true);
  assert.equal(validSavedGame(hiddenPractice), false);

  const zeroMoveWin = stageSave("blind", 1, 20260928, 0);
  const level = generateLevel("blind", zeroMoveWin.seed, 1);
  const finished = replaySolution(level);
  zeroMoveWin.state = finished.state;
  zeroMoveWin.ruleProgress = finished.progress;
  assert.equal(validSavedGame(zeroMoveWin), false);
});

test("timed undo back to zero moves remains resumable", () => {
  const saved = stageSave("blind", 1, 20260928, 0);
  const level = generateLevel("blind", saved.seed, 1);
  const move = compactSolution(level)[0];
  saved.run = createRun(level, "timed", 1);
  saved.run.clockStarted = true;
  saved.run.remainingMs -= 1200;
  saved.run.undo = 2;
  saved.audit = [auditMove(move), { type: "undo" }];
  assert.equal(validSavedGame(saved), true);
});

test("current ad-disabled saves reject reward state", () => {
  const ordinary = stageSave("blind", 1);
  assert.equal(validSavedGame({
    ...ordinary,
    run: { ...ordinary.run, rewards: { undo: true, peek: false }, undo: 6 },
  }), false);
  assert.equal(validSavedGame({
    ...ordinary,
    run: { ...ordinary.run, revived: true, limit: ordinary.run.limit + 30 },
  }), false);

});

test("fresh sealed stages resume with covered tiles while hidden-state tampering is rejected", () => {
  for (const round of [13, 47, 60]) {
    const saved = stageSave("blind", round, 20260928 + round);
    const lane = saved.rules.sealedLane;
    assert.notEqual(lane, null, `sealed lane/${round}`);
    assert.equal(saved.state.hidden[lane].some(Boolean), true, `covered tiles/${round}`);
    assert.equal(validSavedGame(saved), true, `fresh save/${round}`);

    const corrupted = structuredClone(saved);
    const hiddenIndex = corrupted.state.hidden[lane].findIndex(Boolean);
    assert.ok(hiddenIndex >= 0, `hidden index/${round}`);
    corrupted.state.hidden[lane][hiddenIndex] = false;
    assert.equal(validState(corrupted.state, levelConfig("blind", round)), true);
    assert.equal(validSavedGame(corrupted), false, `tampered hidden flag/${round}`);
  }
});

test("a restored win requires every move from the generated starting board", () => {
  const level = generateLevel("blind", 20260928, 1);
  const solution = compactSolution(level);
  let state = structuredClone(level.state);
  let progress = structuredClone(level.progress);
  const history = [];
  solution.forEach((move, index) => {
    history.push({
      state: structuredClone(state),
      moves: index,
      holdingBoosted: false,
      ruleProgress: structuredClone(progress),
    });
    const applied = applyRuleMove(state, move.from, move.to, level.rules, progress);
    state = applied.state;
    progress = applied.progress;
  });
  const saved = {
    ...stageSave("blind", 1, level.seed, solution.length),
    state,
    ruleProgress: progress,
    history,
    audit: solution.map(auditMove),
  };
  assert.equal(validSavedGame(saved), true);
  assert.equal(validSavedGame({ ...saved, history: [] }), false);
  assert.equal(validSavedGame({ ...saved, audit: saved.audit.slice(1) }), false);
});

test("a fabricated one-move completion cannot start from an invented board", () => {
  const level = generateLevel("blind", 20260928, 1);
  const finished = replaySolution(level);
  const previous = structuredClone(finished.state);
  const from = previous.tubes.findIndex((tube) => tube.length === previous.capacity);
  const to = previous.tubes.findIndex((tube) => tube.length === 0);
  previous.tubes[to].push(previous.tubes[from].pop());
  previous.hidden[to].push(false);
  previous.hidden[from].pop();
  const saved = {
    ...stageSave("blind", 1, level.seed, 1),
    state: finished.state,
    ruleProgress: finished.progress,
    history: [{
      state: previous,
      moves: 0,
      holdingBoosted: false,
      ruleProgress: structuredClone(finished.progress),
    }],
    audit: [{ type: "move", from: tube(to), to: tube(from) }],
  };
  assert.equal(validSavedGame(saved), false);
});

test("an invented in-progress board cannot bypass the seed-anchored audit", () => {
  const level = generateLevel("blind", 20260928, 1);
  const finished = replaySolution(level);
  const nearWin = structuredClone(finished.state);
  const from = nearWin.tubes.findIndex((tube) => tube.length === nearWin.capacity);
  const to = nearWin.tubes.findIndex((tube) => tube.length === 0);
  nearWin.tubes[to].push(nearWin.tubes[from].pop());
  nearWin.hidden[to].push(false);
  nearWin.hidden[from].pop();
  const saved = {
    ...stageSave("blind", 1, level.seed, 0),
    state: nearWin,
  };
  assert.equal(validSavedGame(saved), false);
});

test("a legal replay that moves after the move limit is rejected", () => {
  const level = generateLevel("blind", 42, 1);
  let state = structuredClone(level.state);
  let progress = structuredClone(level.progress);
  const audit = [];
  const solution = compactSolution(level);
  const loop = solution[0];
  for (let index = 0; index < 20; index++) {
    for (const { from, to } of [loop, { from: loop.to, to: loop.from }]) {
      const applied = applyRuleMove(state, from, to, level.rules, progress);
      assert.ok(applied);
      state = applied.state;
      progress = applied.progress;
      audit.push(auditMove({ from, to }));
    }
  }
  for (const { from, to } of solution) {
    const applied = applyRuleMove(state, from, to, level.rules, progress);
    assert.ok(applied);
    state = applied.state;
    progress = applied.progress;
    audit.push(auditMove({ from, to }));
  }
  const saved = {
    ...stageSave("blind", 1, level.seed, audit.length),
    state,
    ruleProgress: progress,
    run: createRun(level, "moves", 1),
    audit,
  };
  assert.ok(saved.moves > saved.run.limit);
  assert.equal(validCompletionAudit(saved), false);
  assert.equal(validSavedGame(saved), false);
});

test("completion audit replays a spent undo and a revealed lane", () => {
  const level = generateLevel("blind", 20260928, 4);
  const solution = compactSolution(level);
  let state = structuredClone(level.state);
  let progress = structuredClone(level.progress);
  const audit = [];
  const history = [];
  const hiddenLane = state.hidden.findIndex((lane) => lane.some(Boolean));
  state.hidden[hiddenLane].fill(false);
  audit.push({ type: "peek", lane: hiddenLane });

  for (let index = 0; index < solution.length; index++) {
    const { from, to } = solution[index];
    history.push({
      state: structuredClone(state),
      moves: index,
      holdingBoosted: false,
      ruleProgress: structuredClone(progress),
    });
    let applied = applyRuleMove(state, from, to, level.rules, progress);
    assert.ok(applied);
    const before = { state: structuredClone(state), progress: structuredClone(progress) };
    state = applied.state;
    progress = applied.progress;
    audit.push(auditMove({ from, to }));
    if (index === 0) {
      state = before.state;
      progress = before.progress;
      history.pop();
      audit.push({ type: "undo" });
      history.push({
        state: structuredClone(state),
        moves: index,
        holdingBoosted: false,
        ruleProgress: structuredClone(progress),
      });
      applied = applyRuleMove(state, from, to, level.rules, progress);
      assert.ok(applied);
      state = applied.state;
      progress = applied.progress;
      audit.push(auditMove({ from, to }));
    }
  }

  const saved = {
    ...stageSave("blind", 4, level.seed, solution.length),
    state,
    ruleProgress: progress,
    run: { ...createRun(level, "moves", 4), undo: 2, peek: 1 },
    audit,
    history,
  };
  assert.equal(validSavedGame(saved), true);
  assert.equal(validSavedGame({
    ...saved,
    run: { ...saved.run, undo: 3 },
  }), false);
});

test("save history must match the snapshots derived from the audit", () => {
  const level = generateLevel("blind", 20260928, 5);
  let state = structuredClone(level.state);
  let progress = structuredClone(level.progress);
  const history = [];
  const audit = [];
  for (const [index, move] of compactSolution(level).slice(0, 3).entries()) {
    history.push({
      state: structuredClone(state),
      moves: index,
      holdingBoosted: false,
      ruleProgress: structuredClone(progress),
    });
    const applied = applyRuleMove(state, move.from, move.to, level.rules, progress);
    assert.ok(applied);
    state = applied.state;
    progress = applied.progress;
    audit.push(auditMove(move));
  }
  const saved = {
    ...stageSave("blind", 5, level.seed, 3),
    state,
    ruleProgress: progress,
    history,
    audit,
  };
  assert.equal(validSavedGame(saved), true);
  assert.equal(validSavedGame({ ...saved, history: [...history].reverse() }), false);
  const tampered = structuredClone(history);
  tampered[1].moves = 0;
  assert.equal(validSavedGame({ ...saved, history: tampered }), false);
});
