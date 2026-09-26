import {
  applyMove,
  canPour,
  revealCompleted,
  topColor,
} from "./engine.js";

export function initialRuleProgress(rules) {
  return {
    goalAchieved: rules.goalColor === null,
    sealOpened: rules.sealedLane === null,
  };
}

function completionColor(state, from, to) {
  const color = topColor(state.tubes[from]);
  const destination = state.tubes[to];
  if (color === null || destination.length + 1 !== state.capacity) return null;
  return destination.every((entry) => entry === color) ? color : null;
}

export function canRuleMove(state, from, to, rules, progress) {
  if (!canPour(state, from, to)) return { allowed: false, reason: "base" };
  if (!progress.sealOpened && (from === rules.sealedLane || to === rules.sealedLane)) {
    return { allowed: false, reason: "sealed" };
  }
  const mark = rules.marked.find((entry) => entry.lane === to);
  if (mark && topColor(state.tubes[from]) !== mark.color) {
    return { allowed: false, reason: "marked-color" };
  }
  const completedColor = completionColor(state, from, to);
  if (!progress.goalAchieved && completedColor !== null && completedColor !== rules.goalColor) {
    return { allowed: false, reason: "goal-first" };
  }
  return { allowed: true, reason: null };
}

export function applyRuleMove(state, from, to, rules, progress) {
  if (!canRuleMove(state, from, to, rules, progress).allowed) return null;
  const completedColor = completionColor(state, from, to);
  const nextState = applyMove(state, from, to);
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

export function legalRuleMoves(state, rules, progress) {
  const moves = [];
  for (let from = 0; from < state.tubes.length; from++) {
    for (let to = 0; to < state.tubes.length; to++) {
      if (canRuleMove(state, from, to, rules, progress).allowed) {
        moves.push({ from, to, count: 1 });
      }
    }
  }
  return moves;
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
