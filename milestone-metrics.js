import { cloneState, mixingScore } from "./engine.js?v=engine-2";
import { applyRuleMove, legalRuleMoves } from "./rules.js";

// Calibrated from 500 deterministic blind samples per milestone at ae0f332.
// Structural minima had 2+ moves of headroom (stage 60 early choices bottomed
// out at 2, the explicit non-forced-path floor). Blank-tube thresholds equal
// one capacity-wide fill, proving the witness materially uses an original blank.
export const MILESTONE_GATES = Object.freeze({
  10: Object.freeze({ minSolutionSteps: 24, minMixingScore: 16, minInitialLegalMoves: 8, minEarlyLegalMoves: 7, minBlankTubeMoves: 6 }),
  20: Object.freeze({ minSolutionSteps: 45, minMixingScore: 24, minInitialLegalMoves: 10, minEarlyLegalMoves: 10, minBlankTubeMoves: 8 }),
  30: Object.freeze({ minSolutionSteps: 62, minMixingScore: 32, minInitialLegalMoves: 5, minEarlyLegalMoves: 5, minBlankTubeMoves: 10 }),
  40: Object.freeze({ minSolutionSteps: 68, minMixingScore: 34, minInitialLegalMoves: 16, minEarlyLegalMoves: 15, minBlankTubeMoves: 12 }),
  50: Object.freeze({ minSolutionSteps: 78, minMixingScore: 35, minInitialLegalMoves: 13, minEarlyLegalMoves: 13, minBlankTubeMoves: 14 }),
  60: Object.freeze({ minSolutionSteps: 58, minMixingScore: 30, minInitialLegalMoves: 2, minEarlyLegalMoves: 2, minBlankTubeMoves: 16 }),
});

export function hiddenRatio(state) {
  const hidden = state.hidden?.flat().filter(Boolean).length ?? 0;
  const tiles = state.tubes.flat().length;
  return tiles === 0 ? 0 : hidden / tiles;
}

export function milestoneMetrics(level) {
  let state = cloneState(level.state);
  let progress = { ...level.progress };
  const originalBlankLanes = new Set(
    state.tubes.flatMap((lane, index) => lane.length === 0 ? [index] : []),
  );
  const earlyChoices = [];
  const earlySteps = Math.min(8, level.solution.length);
  for (let step = 0; step <= earlySteps; step++) {
    earlyChoices.push(legalRuleMoves(state, level.rules, progress).length);
    if (step === earlySteps) break;
    const move = level.solution[step];
    const applied = applyRuleMove(state, move.from, move.to, level.rules, progress);
    if (!applied) throw new Error(`Invalid milestone move: ${move.from} -> ${move.to}`);
    state = applied.state;
    progress = applied.progress;
  }
  return {
    solutionSteps: level.solution.length,
    mixingScore: mixingScore(level.state),
    initialLegalMoves: earlyChoices[0] ?? 0,
    earlyLegalMoveFloor: Math.min(...earlyChoices),
    blankTubeMoves: level.solution.filter(({ from, to }) =>
      originalBlankLanes.has(from) || originalBlankLanes.has(to)).length,
    hiddenRatio: hiddenRatio(level.state),
  };
}

export function milestoneMetricIssues(metrics, config) {
  const gate = MILESTONE_GATES[config?.tier];
  if (!gate) return [];
  const issues = [];
  const below = (field, minimum) => {
    const value = metrics?.[field];
    if (!Number.isFinite(value) || value < minimum) {
      issues.push(`${field}=${value ?? "missing"} < ${minimum}`);
    }
  };
  below("solutionSteps", gate.minSolutionSteps);
  if (!Number.isFinite(metrics?.solutionSteps) || metrics.solutionSteps > config.maxSolutionSteps) {
    issues.push(`solutionSteps=${metrics?.solutionSteps ?? "missing"} > ${config.maxSolutionSteps}`);
  }
  below("mixingScore", gate.minMixingScore);
  below("initialLegalMoves", gate.minInitialLegalMoves);
  below("earlyLegalMoveFloor", gate.minEarlyLegalMoves);
  below("blankTubeMoves", gate.minBlankTubeMoves);
  if (config.hidden) below("hiddenRatio", config.minHiddenRatio);
  else if (metrics?.hiddenRatio !== 0) issues.push(`hiddenRatio=${metrics?.hiddenRatio ?? "missing"} !== 0`);
  return issues;
}

export function milestoneContractIssues(level, config) {
  return milestoneMetricIssues(milestoneMetrics(level), config);
}
