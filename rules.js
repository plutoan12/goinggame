import {
  applyTransfer,
  canTransfer,
  holding,
  legalTransfers,
  revealCompleted,
  topAt,
  tube,
} from "./engine.js";

export function initialRuleProgress(rules) {
  return {
    goalAchieved: rules.goalColor === null,
    sealOpened: rules.sealedLane === null,
  };
}

function completionColor(state, from, to) {
  if (to.kind !== "tube") return null;
  const color = topAt(state, from);
  const destination = state.tubes[to.index];
  if (color === null || destination.length + 1 !== state.capacity) return null;
  return destination.every((entry) => entry === color) ? color : null;
}

export function canRuleTransfer(state, from, to, rules, progress) {
  if (!canTransfer(state, from, to)) return { allowed: false, reason: "base" };
  if (!progress.sealOpened && (
    (from.kind === "tube" && from.index === rules.sealedLane) ||
    (to.kind === "tube" && to.index === rules.sealedLane)
  )) {
    return { allowed: false, reason: "sealed" };
  }
  const mark = to.kind === "tube"
    ? rules.marked.find((entry) => entry.lane === to.index)
    : null;
  if (mark && topAt(state, from) !== mark.color) {
    return { allowed: false, reason: "marked-color" };
  }
  const completedColor = completionColor(state, from, to);
  if (!progress.goalAchieved && completedColor !== null && completedColor !== rules.goalColor) {
    return { allowed: false, reason: "goal-first" };
  }
  return { allowed: true, reason: null };
}

export function applyRuleTransfer(state, from, to, rules, progress) {
  if (!canRuleTransfer(state, from, to, rules, progress).allowed) return null;
  const completedColor = completionColor(state, from, to);
  const nextState = applyTransfer(state, from, to);
  if (nextState.hidden) revealCompleted(nextState);
  const nextProgress = { ...progress };
  if (completedColor !== null && completedColor === rules.goalColor) {
    nextProgress.goalAchieved = true;
  }
  if (completedColor !== null && completedColor === rules.unlockColor) {
    nextProgress.sealOpened = true;
  }
  return { state: nextState, progress: nextProgress, completedColor };
}

export function legalRuleTransfers(state, rules, progress) {
  return legalTransfers(state).filter(({ from, to }) =>
    canRuleTransfer(state, from, to, rules, progress).allowed);
}

export function canRuleMove(state, from, to, rules, progress) {
  return canRuleTransfer(state, tube(from), tube(to), rules, progress);
}

export function applyRuleMove(state, from, to, rules, progress) {
  return applyRuleTransfer(state, tube(from), tube(to), rules, progress);
}

export function legalRuleMoves(state, rules, progress) {
  return legalRuleTransfers(state, rules, progress)
    .filter(({ from, to }) => from.kind === "tube" && to.kind === "tube")
    .map(({ from, to, count }) => ({ from: from.index, to: to.index, count }));
}

export function validRules(rules, config) {
  if (!rules || typeof rules !== "object" || !Array.isArray(rules.marked)) return false;
  const lanes = config.colors + config.blanks;
  const validColor = (color) => Number.isInteger(color) && color >= 0 && color < config.colors;
  const validOptionalColor = (color) => color === null || validColor(color);
  const validOptionalLane = (lane) => lane === null || (
    Number.isInteger(lane) && lane >= 0 && lane < lanes
  );
  if (!validOptionalColor(rules.goalColor) || !validOptionalColor(rules.unlockColor)) return false;
  if (!validOptionalLane(rules.sealedLane)) return false;
  if ((rules.sealedLane === null) !== (rules.unlockColor === null)) return false;
  if (rules.goalColor !== null && rules.unlockColor !== null && rules.goalColor !== rules.unlockColor) {
    return false;
  }
  const seen = new Set();
  for (const mark of rules.marked) {
    if (!mark || !Number.isInteger(mark.lane) || mark.lane < 0 || mark.lane >= lanes) return false;
    if (!validColor(mark.color) || seen.has(mark.lane)) return false;
    seen.add(mark.lane);
  }
  return true;
}

export function validRuleProgress(progress, rules) {
  if (!progress || typeof progress.goalAchieved !== "boolean" || typeof progress.sealOpened !== "boolean") {
    return false;
  }
  if (rules.goalColor === null && !progress.goalAchieved) return false;
  if (rules.sealedLane === null && !progress.sealOpened) return false;
  return true;
}
