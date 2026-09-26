import test from "node:test";
import assert from "node:assert/strict";
import { generateLevel } from "./level-generator.js";
import { createRun } from "./session.js";
import { SAVE_KEY, validSavedGame, validState } from "./saved-game.js";
import { levelConfig } from "./stage-config.js";

function stage20Save({ extra = false, sealOpened = false } = {}) {
  const level = generateLevel("blind", 20260926, 20);
  const state = structuredClone(level.state);
  if (extra) {
    state.tubes.push([]);
    state.hidden.push([]);
  }
  return {
    version: 1,
    mode: "blind",
    round: 20,
    seed: level.seed,
    state,
    moves: 9,
    extra,
    attemptId: "stage-20-attempt",
    rules: level.rules,
    ruleProgress: { ...level.progress, sealOpened },
    run: createRun(level, "moves", 20),
    history: [],
  };
}

test("only the fresh twenty-stage rule snapshot is accepted", () => {
  const saved = stage20Save();
  assert.equal(SAVE_KEY, "twelve-puzzle-game-v1");
  assert.equal(validSavedGame(saved), true);
  assert.equal(validSavedGame({ ...saved, version: 0 }), false);
  assert.equal(validSavedGame({ ...saved, round: 21 }), false);
  assert.equal(validSavedGame({ ...saved, seed: -1 }), false);
  assert.equal(validSavedGame({ ...saved, ruleProgress: { goalAchieved: "yes", sealOpened: false } }), false);
  assert.equal(validSavedGame({ ...saved, rules: { ...saved.rules, sealedLane: 99 } }), false);
  assert.equal(validSavedGame({ ...saved, rules: { ...saved.rules, goalColor: 99 } }), false);
  assert.equal(validSavedGame({
    ...saved,
    rules: { goalColor: null, marked: [], sealedLane: null, unlockColor: null },
    ruleProgress: { goalAchieved: true, sealOpened: true },
  }), false);
  assert.equal(validSavedGame({ ...saved, history: [{ state: saved.state }] }), false);
  assert.equal(validSavedGame({ mode: "blind", round: 5, state: saved.state }), false);
});

test("stage twenty undo restores the one-blank rule state around an extra lane", () => {
  const before = stage20Save({ extra: false, sealOpened: false });
  const after = stage20Save({ extra: true, sealOpened: true });
  after.history = [{
    state: structuredClone(before.state),
    moves: before.moves,
    extra: false,
    ruleProgress: structuredClone(before.ruleProgress),
  }];
  assert.equal(before.state.tubes.length, 15);
  assert.equal(after.state.tubes.length, 16);
  assert.equal(validSavedGame(after), true);
  assert.deepEqual(after.history[0].ruleProgress, before.ruleProgress);
  assert.equal(after.history[0].state.tubes.length, 15);
  assert.equal(validState(after.state, levelConfig("blind", 20), 1), true);
  assert.equal(validSavedGame({ ...after, state: before.state }), false);
});

test("board validation rejects malformed colors, hidden flags and lane counts", () => {
  const saved = stage20Save();
  const config = levelConfig(saved.mode, saved.round);
  assert.equal(validState(saved.state, config, 0), true);
  const wrongColor = structuredClone(saved.state);
  wrongColor.tubes[0][0] = 99;
  assert.equal(validState(wrongColor, config, 0), false);
  const hiddenTop = structuredClone(saved.state);
  const lane = hiddenTop.tubes.findIndex((tube) => tube.length);
  hiddenTop.hidden[lane][hiddenTop.hidden[lane].length - 1] = true;
  assert.equal(validState(hiddenTop, config, 0), false);
  const missingLane = structuredClone(saved.state);
  missingLane.tubes.pop();
  missingLane.hidden.pop();
  assert.equal(validState(missingLane, config, 0), false);
});
