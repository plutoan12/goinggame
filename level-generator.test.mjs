import test from "node:test";
import assert from "node:assert/strict";
import { isWin, tube } from "./engine.js";
import { applyRuleTransfer, validRuleProgress, validRules } from "./rules.js";
import { levelConfig } from "./stage-config.js";
import {
  CANDIDATES_PER_SEED,
  LevelGenerationError,
  SEED_RETRIES,
  compactSolution,
  generateLevel,
  hiddenRatio,
  replaySolution,
} from "./level-generator.js";
import * as generator from "./level-generator.js";
import { createRun } from "./session.js";

const manualHiddenRatio = (state) => {
  const tiles = state.tubes.flat().length;
  return tiles === 0 ? 0 : state.hidden.flat().filter(Boolean).length / tiles;
};

test("hidden ratio counts every pet tile including fully visible tubes", () => {
  const state = {
    tubes: [[0, 1], [2, 3]],
    hidden: [[true, false], [false, false]],
  };
  assert.equal(hiddenRatio(state), 0.25);
});

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

test("sealed lanes preserve blind coverage while keeping their top tile visible", () => {
  for (let round = 1; round <= 60; round++) {
    if (!levelConfig("blind", round).ruleKinds.includes("sealed")) continue;
    for (let seed = 1; seed <= 5; seed++) {
      const level = generateLevel("blind", 5000 + round * 100 + seed, round);
      const lane = level.rules.sealedLane;
      assert.notEqual(lane, null, `${round}/${seed}: sealed lane`);
      assert.equal(
        level.state.hidden[lane].at(-1),
        false,
        `${round}/${seed}: sealed top stays visible`,
      );
      assert.equal(
        level.state.hidden[lane].some(Boolean),
        true,
        `${round}/${seed}: sealed covered tiles stay hidden`,
      );
    }
  }
});

test("stage sixty blind seeds meet the all-tile hidden target", () => {
  const config = levelConfig("blind", 60);
  for (let seed = 1; seed <= 5; seed++) {
    const level = generateLevel("blind", seed, 60);
    assert.equal(hiddenRatio(level.state), manualHiddenRatio(level.state), `manual/${seed}`);
    assert.ok(hiddenRatio(level.state) >= config.minHiddenRatio, `ratio/${seed}`);
    assert.ok(level.state.hidden.every((flags) => !flags.at(-1)), `top/${seed}`);
  }
});

test("all stage seeds start with configured holding and pass generation filters", () => {
  for (const mode of ["blind", "practice"])
    for (let round = 1; round <= 60; round++)
      for (let seed = 1; seed <= 5; seed++) {
        const config = levelConfig(mode, round);
        const level = generateLevel(mode, seed, round);
        assert.deepEqual(
          level.state.holding,
          Array(config.holdingSlots).fill(null),
          `holding/${mode}/${round}/${seed}`,
        );
        if (mode === "blind") {
          assert.equal(
            hiddenRatio(level.state),
            manualHiddenRatio(level.state),
            `manual-hidden/${mode}/${round}/${seed}`,
          );
          assert.ok(
            hiddenRatio(level.state) >= config.minHiddenRatio,
            `hidden/${mode}/${round}/${seed}`,
          );
        }
        assert.ok(
          level.solution.length <= config.maxSolutionSteps,
          `returned-steps/${mode}/${round}/${seed}`,
        );
        let state = level.state;
        let progress = level.progress;
        for (const move of level.solution) {
          const applied = applyRuleTransfer(
            state,
            tube(move.from),
            tube(move.to),
            level.rules,
            progress,
          );
          assert.ok(applied, `${mode}/${round}/${seed}: ${move.from}->${move.to}`);
          state = applied.state;
          progress = applied.progress;
        }
        assert.equal(isWin(state), true, `${mode}/${round}/${seed}`);
      }
});

test("rule-aware compact solutions determine the move budget", () => {
  for (let round = 1; round <= 60; round++) {
    const level = generateLevel("blind", 1700 + round, round);
    const solution = compactSolution(level);
    const run = createRun(level, "moves", round);
    assert.equal(run.limit, Math.max(24, Math.ceil(solution.length * 1.25) + 8));
    assert.ok(solution.length <= run.limit);
  }
});

test("milestone gates measure every approved difficulty factor with calibrated headroom", () => {
  assert.equal(typeof generator.milestoneMetrics, "function");
  assert.equal(typeof generator.milestoneMetricIssues, "function");
  assert.deepEqual(generator.MILESTONE_GATES, {
    10: { minSolutionSteps: 24, minMixingScore: 16, minInitialLegalMoves: 8, minEarlyLegalMoves: 7, minBlankTubeMoves: 6 },
    20: { minSolutionSteps: 45, minMixingScore: 24, minInitialLegalMoves: 10, minEarlyLegalMoves: 10, minBlankTubeMoves: 8 },
    30: { minSolutionSteps: 62, minMixingScore: 32, minInitialLegalMoves: 5, minEarlyLegalMoves: 5, minBlankTubeMoves: 10 },
    40: { minSolutionSteps: 68, minMixingScore: 34, minInitialLegalMoves: 16, minEarlyLegalMoves: 15, minBlankTubeMoves: 12 },
    50: { minSolutionSteps: 78, minMixingScore: 35, minInitialLegalMoves: 13, minEarlyLegalMoves: 13, minBlankTubeMoves: 14 },
    60: { minSolutionSteps: 58, minMixingScore: 30, minInitialLegalMoves: 2, minEarlyLegalMoves: 2, minBlankTubeMoves: 16 },
  });
  if (typeof generator.milestoneMetrics !== "function") return;

  for (const round of [10, 20, 30, 40, 50, 60]) {
    for (let seed = 1; seed <= 10; seed++) {
      const config = levelConfig("blind", round);
      const level = generateLevel("blind", seed, round);
      const metrics = generator.milestoneMetrics(level);
      assert.deepEqual(
        generator.milestoneMetricIssues(metrics, config),
        [],
        `${round}/${seed}: ${JSON.stringify(metrics)}`,
      );
    }
  }
});
