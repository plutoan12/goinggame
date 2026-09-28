import test from "node:test";
import assert from "node:assert/strict";
import { isWin } from "./engine.js";
import { applyRuleMove, validRuleProgress, validRules } from "./rules.js";
import { levelConfig } from "./stage-config.js";
import {
  CANDIDATES_PER_SEED,
  LevelGenerationError,
  SEED_RETRIES,
  compactSolution,
  generateLevel,
  replaySolution,
} from "./level-generator.js";
import { createRun } from "./session.js";

test("generation is deterministic, seed-dependent and reports bounded fallback metadata", () => {
  const first = generateLevel("blind", 42, 20);
  assert.deepEqual(first, generateLevel("blind", 42, 20));
  assert.notDeepEqual(first.state, generateLevel("blind", 43, 20).state);
  assert.equal(Number.isSafeInteger(first.seed), true);
  assert.equal(CANDIDATES_PER_SEED, 40);
  assert.equal(SEED_RETRIES, 16);
  const error = new LevelGenerationError("blind", 20, 7);
  assert.deepEqual(
    [error.mode, error.round, error.requestedSeed, error.candidatesPerSeed, error.seedRetries],
    ["blind", 20, 7, 40, 16],
  );
});

test("generated levels contain the approved pet counts", () => {
  for (let round = 1; round <= 20; round++) {
    const config = levelConfig("blind", round);
    const level = generateLevel("blind", 900 + round, round);
    const counts = Array(config.colors).fill(0);
    level.state.tubes.flat().forEach((color) => counts[color]++);
    assert.deepEqual(counts, Array(config.colors).fill(config.capacity));
    assert.equal(level.state.tubes.length, config.colors + config.blanks);
  }
});

test("special stages receive compatible goal, marked and sealed rules", () => {
  for (const round of [5, 9, 11, 13, 17, 18, 19, 20]) {
    const config = levelConfig("blind", round);
    const level = generateLevel("blind", 1200 + round, round);
    assert.equal(validRules(level.rules, config), true, `rules/${round}`);
    assert.equal(validRuleProgress(level.progress, level.rules), true, `progress/${round}`);
    assert.equal(level.rules.goalColor !== null, config.ruleKinds.includes("goal"));
    assert.equal(level.rules.sealedLane !== null, config.ruleKinds.includes("sealed"));
    assert.equal(level.rules.marked.length, config.markedCount, `marks/${round}`);
    if (level.rules.goalColor !== null && level.rules.unlockColor !== null) {
      assert.equal(level.rules.goalColor, level.rules.unlockColor);
    }
    assert.equal(isWin(replaySolution(level).state), true, `win/${round}`);
  }
});

test("generated marked rules use configured counts for ordinary and boss stages", () => {
  const cases = [
    [26, 1], [29, 1], [30, 2],
    [36, 1], [39, 1], [40, 2],
    [46, 1], [49, 1], [50, 2],
    [56, 1], [59, 1], [60, 2],
  ];
  for (const [round, expected] of cases) {
    const config = levelConfig("blind", round);
    const level = generateLevel("blind", 2400 + round, round);
    assert.equal(config.markedCount, expected, `config/${round}`);
    assert.equal(level.rules.marked.length, expected, `generated/${round}`);
  }
});

test("sealed lanes reveal every starting tile before they unlock", () => {
  for (const round of [13, 14, 15, 16, 18, 19, 20]) {
    for (let seed = 1; seed <= 10; seed++) {
      const level = generateLevel("blind", 5000 + round * 100 + seed, round);
      const lane = level.rules.sealedLane;
      assert.notEqual(lane, null, `${round}/${seed}: sealed lane`);
      assert.equal(
        level.state.hidden[lane].some(Boolean),
        false,
        `${round}/${seed}: sealed contents stay visible`,
      );
    }
  }
});

test("2000 boards solve through the same rule engine used by players", () => {
  for (const mode of ["blind", "practice"])
    for (let round = 1; round <= 20; round++)
      for (let seed = 1; seed <= 50; seed++) {
        const level = generateLevel(mode, seed, round);
        let state = level.state;
        let progress = level.progress;
        for (const move of level.solution) {
          const applied = applyRuleMove(state, move.from, move.to, level.rules, progress);
          assert.ok(applied, `${mode}/${round}/${seed}: ${move.from}->${move.to}`);
          state = applied.state;
          progress = applied.progress;
        }
        assert.equal(isWin(state), true, `${mode}/${round}/${seed}`);
      }
});

test("rule-aware compact solutions determine the move budget", () => {
  for (let round = 1; round <= 20; round++) {
    const level = generateLevel("blind", 1700 + round, round);
    const solution = compactSolution(level);
    const run = createRun(level, "moves", round);
    assert.equal(run.limit, Math.max(24, Math.ceil(solution.length * 1.25) + 8));
    assert.ok(solution.length <= run.limit);
  }
});
