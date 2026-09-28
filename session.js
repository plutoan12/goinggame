import {
  isWin,
  legalTransfers,
  cloneState,
} from "./engine.js?v=engine-2";
import { compactSolution } from "./level-generator.js?v=generator-3";
import { levelConfig } from "./stage-config.js?v=stages-2";

export { compactSolution } from "./level-generator.js?v=generator-3";

export function timerFields(rule = "moves", stage = 1) {
  const timeLimitMs = levelConfig("blind", stage).timeLimitMs;
  return { rule, timeLimitMs, remainingMs: timeLimitMs, clockStarted: false };
}

export function createRun(level, rule = "moves", stage = 1) {
  // A known legal solution fits; this is not an optimal-solution estimate.
  return {
    limit: Math.max(24, Math.ceil(compactSolution(level).length * 1.25) + 8),
    ...timerFields(rule, stage),
    undo: 3,
    peek: 2,
    revived: false,
    rewards: { undo: false, peek: false },
  };
}
export function validRun(run) {
  return (
    !!run &&
    Number.isSafeInteger(run.limit) &&
    run.limit > 0 &&
    ["moves", "timed"].includes(run.rule) &&
    Number.isSafeInteger(run.timeLimitMs) &&
    run.timeLimitMs > 0 &&
    Number.isFinite(run.remainingMs) &&
    run.remainingMs >= 0 &&
    run.remainingMs <= run.timeLimitMs + 60000 &&
    typeof run.clockStarted === "boolean" &&
    Number.isInteger(run.undo) &&
    run.undo >= 0 &&
    run.undo <= 6 &&
    Number.isInteger(run.peek) &&
    run.peek >= 0 &&
    run.peek <= 4 &&
    typeof run.revived === "boolean" &&
    !!run.rewards &&
    typeof run.rewards.undo === "boolean" &&
    typeof run.rewards.peek === "boolean"
  );
}
export function outcome(state, moves, run, mode, availableMoves = legalTransfers) {
  if (isWin(state)) return "won"; // Last permitted move can still win.
  if (mode === "practice") return "playing";
  if (run.rule === "timed" && run.remainingMs <= 0) return "time";
  if (run.rule !== "timed" && moves >= run.limit) return "moves";
  if (!availableMoves(state).length) return "blocked";
  return "playing";
}
export function elapse(run, milliseconds) {
  if (
    run.rule !== "timed" ||
    !run.clockStarted ||
    !Number.isFinite(milliseconds) ||
    milliseconds <= 0
  )
    return run;
  return { ...run, remainingMs: Math.max(0, run.remainingMs - milliseconds) };
}
export function accountRunClock(run, clockStamp, now, keepArmed = false) {
  const nextRun = clockStamp === null
    ? run
    : elapse(run, now - clockStamp);
  const armed = keepArmed &&
    nextRun.rule === "timed" &&
    nextRun.clockStarted &&
    nextRun.remainingMs > 0;
  return { run: nextRun, clockStamp: armed ? now : null };
}
export function formatTime(milliseconds) {
  const seconds = Math.ceil(Math.max(0, milliseconds) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
export function canReturnToItemsAfterLoss(
  result,
  {
    historyLength = 0,
    undo = 0,
    holdingBoosted = true,
    state = null,
    availableMoves = legalTransfers,
  } = {},
) {
  const canUndo = historyLength > 0 && undo > 0;
  if (result === "moves") return canUndo;
  if (result === "blocked") {
    const canAddHolding = !holdingBoosted && state !== null &&
      availableMoves(addHoldingSlot(state)).length > 0;
    return canUndo || canAddHolding;
  }
  return false;
}
export function addHoldingSlot(state) {
  const next = cloneState(state);
  if (!next.holding) next.holding = [];
  next.holding.push(null);
  return next;
}
export function consumeItem(run, item, mode) {
  if (!["undo", "peek"].includes(item)) return null;
  if (mode === "practice") return structuredClone(run);
  if (run[item] <= 0) return null;
  return { ...run, [item]: run[item] - 1 };
}
export function revealLane(state, lane) {
  if (!state.hidden[lane]?.some(Boolean)) return state;
  const next = cloneState(state);
  next.hidden[lane].fill(false);
  return next;
}
export function grantReward(run, kind, moves) {
  const next = structuredClone(run);
  if (kind === "revive") {
    if (run.revived) return null;
    next.revived = true;
    next.limit = Math.max(run.limit, moves) + 30;
    if (run.rule === "timed") next.remainingMs += 60000;
  } else if (["undo", "peek"].includes(kind)) {
    if (run.rewards[kind]) return null;
    next.rewards[kind] = true;
    next[kind] += kind === "undo" ? 3 : 2;
  } else return null;
  return next;
}
