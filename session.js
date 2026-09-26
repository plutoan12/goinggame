import {
  isWin,
  legalMoves,
  cloneState,
  applyMove,
  revealCompleted,
} from "./engine.js";

// Erase loops in the generator's witness, without claiming an optimal solution.
export function compactSolution(level) {
  let state = cloneState(level.state);
  const key = (s) => JSON.stringify(s);
  const keys = [key(state)],
    seen = new Map([[keys[0], 0]]),
    path = [];
  for (const move of level.solution) {
    state = revealCompleted(applyMove(state, move.from, move.to));
    const nextKey = key(state);
    if (seen.has(nextKey)) {
      const index = seen.get(nextKey);
      for (const removed of keys.splice(index + 1)) seen.delete(removed);
      path.length = index;
    } else {
      path.push(move);
      keys.push(nextKey);
      seen.set(nextKey, path.length);
    }
  }
  return path;
}

export function timerFields(rule = "moves", stage = 1) {
  const timeLimitMs =
    [90, 150, 240, 360, 480][Math.min(4, Math.max(0, stage - 1))] * 1000;
  return { rule, timeLimitMs, remainingMs: timeLimitMs, clockStarted: false };
}

export function createRun(level, rule = "moves", stage = 1) {
  // A known legal solution fits; this is not an optimal-solution estimate.
  return {
    limit: Math.max(24, Math.ceil(compactSolution(level).length * 1.2) + 6),
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
export function outcome(state, moves, run, mode) {
  if (isWin(state)) return "won"; // Last permitted move can still win.
  if (mode === "practice") return "playing";
  if (run.rule === "timed" && run.remainingMs <= 0) return "time";
  if (run.rule !== "timed" && moves >= run.limit) return "moves";
  if (!legalMoves(state).length) return "blocked";
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
export function formatTime(milliseconds) {
  const seconds = Math.ceil(Math.max(0, milliseconds) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
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
