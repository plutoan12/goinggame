import {
  applyMove,
  cloneState,
  generateBaseLevel,
  isSingleColor,
  isWin,
  revealCompleted,
  topColor,
} from "./engine.js?v=engine-2";
import { applyRuleMove, initialRuleProgress } from "./rules.js";
import { levelConfig } from "./stage-config.js?v=stages-2";

export const CANDIDATES_PER_SEED = 40;
export const SEED_RETRIES = 16;

export function hiddenRatio(state) {
  let hidden = 0;
  let tiles = 0;
  state.hidden?.forEach((flags, lane) => {
    if (!flags.some(Boolean)) return;
    hidden += flags.filter(Boolean).length;
    tiles += state.tubes[lane].length;
  });
  return tiles === 0 ? 0 : hidden / tiles;
}

export class LevelGenerationError extends Error {
  constructor(mode, round, requestedSeed) {
    super(`검증된 ${round}단계 보드를 만들지 못했습니다.`);
    this.name = "LevelGenerationError";
    this.mode = mode;
    this.round = round;
    this.requestedSeed = requestedSeed;
    this.candidatesPerSeed = CANDIDATES_PER_SEED;
    this.seedRetries = SEED_RETRIES;
  }
}

function moveAnalysis(level) {
  let state = cloneState(level.state);
  const incoming = state.tubes.map(() => []);
  const firstTouch = state.tubes.map(() => Infinity);
  const completions = [];
  for (let step = 0; step < level.solution.length; step++) {
    const { from, to } = level.solution[step];
    const color = topColor(state.tubes[from]);
    incoming[to].push(color);
    firstTouch[from] = Math.min(firstTouch[from], step);
    firstTouch[to] = Math.min(firstTouch[to], step);
    state = revealCompleted(applyMove(state, from, to));
    const destination = state.tubes[to];
    if (destination.length === state.capacity && isSingleColor(destination)) {
      completions.push({ step, color: destination[0], lane: to });
    }
  }
  return { finalState: state, incoming, firstTouch, completions };
}

function assignRules(level, config) {
  const analysis = moveAnalysis(level);
  if (!isWin(analysis.finalState)) return null;
  const needsGoal = config.ruleKinds.includes("goal");
  const needsSeal = config.ruleKinds.includes("sealed");
  const marksNeeded = config.markedCount;
  const first = analysis.completions[0];
  if ((needsGoal || needsSeal) && !first) return null;

  const markCandidates = analysis.finalState.tubes
    .map((tube, lane) => ({ tube, lane, incoming: analysis.incoming[lane] }))
    .filter(({ tube, incoming }) =>
      tube.length === config.capacity &&
      isSingleColor(tube) &&
      incoming.length > 0 &&
      incoming.every((color) => color === tube[0]),
    )
    .sort((a, b) => b.incoming.length - a.incoming.length || a.lane - b.lane);
  if (markCandidates.length < marksNeeded) return null;

  const sealCandidates = needsSeal
    ? analysis.firstTouch
      .map((touch, lane) => ({ lane, touch }))
      .filter(({ touch }) => touch > first.step)
      .sort((a, b) => Number.isFinite(a.touch) === Number.isFinite(b.touch)
        ? a.touch - b.touch
        : Number.isFinite(a.touch) ? -1 : 1)
    : [{ lane: null, touch: Infinity }];
  if (!sealCandidates.length) return null;

  for (const seal of sealCandidates) {
    let selectedMarks = markCandidates.filter(({ lane }) => lane !== seal.lane).slice(0, marksNeeded);
    if (selectedMarks.length < marksNeeded && marksNeeded > 0) {
      selectedMarks = markCandidates.slice(0, marksNeeded);
    }
    if (selectedMarks.length < marksNeeded) continue;
    const rules = {
      goalColor: needsGoal ? first.color : null,
      marked: selectedMarks.map(({ lane, tube }) => ({ lane, color: tube[0] })),
      sealedLane: needsSeal ? seal.lane : null,
      unlockColor: needsSeal ? first.color : null,
    };
    const state = cloneState(level.state);
    if (rules.sealedLane !== null) state.hidden?.[rules.sealedLane]?.fill(false);
    const progress = initialRuleProgress(rules);
    const candidate = { ...level, state, rules, progress };
    try {
      if (isWin(replaySolution(candidate).state)) return candidate;
    } catch {
      // Try the next compatible lane assignment.
    }
  }
  return null;
}

function normalizedSeed(seed) {
  return Number.isSafeInteger(seed) ? seed >>> 0 : 1;
}

function candidateSeed(seed, candidate) {
  return candidate === 0 ? seed : (seed + Math.imul(candidate, 0x9e3779b1)) >>> 0;
}

export function generateLevel(mode = "blind", requestedSeed = 1, round = 1) {
  const config = levelConfig(mode, round);
  const firstSeed = normalizedSeed(requestedSeed);
  for (let retry = 0; retry < SEED_RETRIES; retry++) {
    const resolvedSeed = (firstSeed + retry) >>> 0;
    for (let candidate = 0; candidate < CANDIDATES_PER_SEED; candidate++) {
      const base = generateBaseLevel(mode, candidateSeed(resolvedSeed, candidate), config.tier);
      base.state.holding = Array(config.holdingSlots).fill(null);
      const level = assignRules(base, config);
      if (!level) continue;
      if (config.hidden && hiddenRatio(level.state) < config.minHiddenRatio) continue;
      if (compactSolution(level).length > config.maxSolutionSteps) continue;
      return { ...level, seed: resolvedSeed };
    }
  }
  throw new LevelGenerationError(mode, config.tier, requestedSeed);
}

function ruleContext(level) {
  const rules = level.rules ?? {
    goalColor: null,
    marked: [],
    sealedLane: null,
    unlockColor: null,
  };
  return { rules, progress: { ...(level.progress ?? initialRuleProgress(rules)) } };
}

export function replaySolution(level) {
  let state = cloneState(level.state);
  const context = ruleContext(level);
  let progress = context.progress;
  for (const { from, to } of level.solution) {
    const applied = applyRuleMove(state, from, to, context.rules, progress);
    if (!applied) throw new Error(`Invalid generated move: ${from} -> ${to}`);
    state = applied.state;
    progress = applied.progress;
  }
  return { state, progress };
}

export function compactSolution(level) {
  let state = cloneState(level.state);
  const context = ruleContext(level);
  let progress = context.progress;
  const key = () => JSON.stringify([state, progress]);
  const keys = [key()];
  const seen = new Map([[keys[0], 0]]);
  const path = [];
  for (const move of level.solution) {
    const applied = applyRuleMove(state, move.from, move.to, context.rules, progress);
    if (!applied) throw new Error(`Invalid generated move: ${move.from} -> ${move.to}`);
    state = applied.state;
    progress = applied.progress;
    const nextKey = key();
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
