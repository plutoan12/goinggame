import { applyRuleTransfer, validRules, validRuleProgress } from "./rules.js";
import { cloneState, isWin, revealCompleted } from "./engine.js?v=engine-2";
import { generateLevel } from "./level-generator.js?v=generator-2";
import {
  addHoldingSlot,
  createRun,
  revealLane,
  validRun,
} from "./session.js?v=limits-2";
import { levelConfig, STAGES } from "./stage-config.js?v=stages-2";
import { releaseConfig } from "./release-config.js";

export const SAVE_KEY = "twelve-puzzle-game-v4";

export function createSaveWriter(storage, key, onFailure = () => {}) {
  let storageError = false;
  let warned = false;
  return {
    get storageError() {
      return storageError;
    },
    write(value) {
      try {
        storage.setItem(key, JSON.stringify(value));
        storageError = false;
        warned = false;
        return true;
      } catch {
        storageError = true;
        if (!warned) {
          warned = true;
          onFailure();
        }
        return false;
      }
    },
  };
}

export function validState(state, config, addedLanes = 0, addedHoldingSlots = 0) {
  if (
    !state ||
    state.capacity !== config.capacity ||
    !Number.isInteger(addedLanes) ||
    addedLanes < 0 ||
    !Number.isInteger(addedHoldingSlots) ||
    addedHoldingSlots < 0 ||
    !Array.isArray(state.tubes) ||
    state.tubes.length !== config.colors + config.blanks + addedLanes ||
    !Array.isArray(state.hidden) ||
    state.hidden.length !== state.tubes.length ||
    !Array.isArray(state.holding) ||
    state.holding.length !== config.holdingSlots + addedHoldingSlots
  ) return false;
  const counts = Array(config.colors).fill(0);
  const countPet = (color) =>
    Number.isInteger(color) &&
    color >= 0 &&
    color < config.colors &&
    ++counts[color];
  const validLanes = state.tubes.every((tube, lane) =>
    Array.isArray(tube) &&
    tube.length <= config.capacity &&
    Array.isArray(state.hidden[lane]) &&
    state.hidden[lane].length === tube.length &&
    state.hidden[lane].every((hidden) => typeof hidden === "boolean") &&
    !state.hidden[lane].at(-1) &&
    tube.every(countPet)
  );
  const validHolding = state.holding.every((color) =>
    color === null || countPet(color)
  );
  return validLanes && validHolding &&
    counts.every((count) => count === config.capacity);
}

function validAttemptId(id) {
  return typeof id === "string" && /^[a-zA-Z0-9-]{1,80}$/.test(id);
}

function validSnapshot(snapshot, config, rules, revived) {
  return !!snapshot &&
    Number.isSafeInteger(snapshot.moves) && snapshot.moves >= 0 &&
    typeof snapshot.holdingBoosted === "boolean" &&
    validRuleProgress(snapshot.ruleProgress, rules) &&
    validState(
      snapshot.state,
      config,
      Number(revived),
      Number(snapshot.holdingBoosted),
    );
}

function matchesStageRules(rules, config) {
  const has = (kind) => config.ruleKinds.includes(kind);
  return (rules.goalColor !== null) === has("goal") &&
    rules.marked.length === config.markedCount &&
    (rules.sealedLane !== null) === has("sealed");
}

function sameRules(left, right) {
  return left.goalColor === right.goalColor &&
    left.sealedLane === right.sealedLane &&
    left.unlockColor === right.unlockColor &&
    left.marked.length === right.marked.length &&
    left.marked.every((mark, index) =>
      mark.lane === right.marked[index].lane && mark.color === right.marked[index].color
    );
}

function allVisible(state) {
  return state.hidden.every((lane) => lane.every((hidden) => !hidden));
}

function sameState(left, right) {
  return left.capacity === right.capacity &&
    left.tubes.length === right.tubes.length &&
    left.tubes.every((tube, lane) =>
      tube.length === right.tubes[lane].length &&
      tube.every((color, index) => color === right.tubes[lane][index]) &&
      left.hidden[lane].length === right.hidden[lane].length &&
      left.hidden[lane].every((hidden, index) => hidden === right.hidden[lane][index])
    ) &&
    left.holding.length === right.holding.length &&
    left.holding.every((color, index) => color === right.holding[index]);
}

function sealedLaneVisible(state, rules) {
  return rules.sealedLane === null ||
    state.hidden[rules.sealedLane]?.every((hidden) => !hidden) === true;
}

function validLocationShape(location) {
  return !!location &&
    typeof location === "object" &&
    !Array.isArray(location) &&
    Object.keys(location).length === 2 &&
    ["tube", "holding"].includes(location.kind) &&
    Number.isInteger(location.index) &&
    location.index >= 0;
}

function validAuditShape(audit) {
  return Array.isArray(audit) &&
    audit.every((event) => {
      if (!event || typeof event !== "object") return false;
      if (event.type === "undo" || event.type === "holding-plus") return true;
      if (event.type === "peek") return Number.isInteger(event.lane);
      return event.type === "move" &&
        validLocationShape(event.from) && validLocationShape(event.to);
    });
}

function replayAudit(saved, initial) {
  let state = cloneState(initial.state);
  let progress = structuredClone(initial.progress);
  let moves = 0;
  let holdingBoosted = false;
  let undo = 3;
  let peek = 2;
  let snapshots = [];
  for (const event of saved.audit) {
    if (isWin(state)) return null;
    if (event.type === "move") {
      if (
        saved.mode !== "practice" &&
        saved.run.rule === "moves" &&
        moves >= saved.run.limit
      ) return null;
      snapshots.push({
        state: cloneState(state),
        moves,
        holdingBoosted,
        ruleProgress: { ...progress },
      });
      if (snapshots.length > 100) snapshots.shift();
      const applied = applyRuleTransfer(
        state, event.from, event.to, saved.rules, progress,
      );
      if (!applied) return null;
      state = applied.state;
      progress = applied.progress;
      moves++;
    } else if (event.type === "undo") {
      if (!snapshots.length || (saved.mode !== "practice" && undo <= 0)) return null;
      if (saved.mode !== "practice") undo--;
      const snapshot = snapshots.pop();
      state = snapshot.state;
      moves = snapshot.moves;
      holdingBoosted = snapshot.holdingBoosted;
      progress = snapshot.ruleProgress;
    } else if (event.type === "holding-plus") {
      if (holdingBoosted) return null;
      state = addHoldingSlot(state);
      holdingBoosted = true;
      snapshots = [];
    } else if (event.type === "peek") {
      if (
        event.lane < 0 ||
        event.lane >= state.tubes.length ||
        (saved.mode !== "practice" && peek <= 0)
      ) return null;
      const revealed = revealLane(state, event.lane);
      if (revealed === state) return null;
      if (saved.mode !== "practice") peek--;
      state = revealCompleted(revealed);
      snapshots = [];
    } else {
      return null;
    }
  }
  return { state, progress, moves, holdingBoosted, undo, peek, snapshots };
}

function replayMatchesSaved(saved, initial, requireWin = false) {
  const replayed = replayAudit(saved, initial);
  return replayed &&
    (!requireWin || isWin(replayed.state)) &&
    sameState(replayed.state, saved.state) &&
    replayed.moves === saved.moves &&
    replayed.holdingBoosted === saved.holdingBoosted &&
    replayed.progress.goalAchieved === saved.ruleProgress.goalAchieved &&
    replayed.progress.sealOpened === saved.ruleProgress.sealOpened &&
    replayed.undo === saved.run.undo &&
    replayed.peek === saved.run.peek
    ? replayed
    : null;
}

function historyMatchesReplay(saved, replayed, config) {
  return saved.history.length === replayed.snapshots.length &&
    saved.history.every((snapshot, index) => {
      const expected = replayed.snapshots[index];
      return validSnapshot(snapshot, config, saved.rules, false) &&
        snapshot.moves === expected.moves &&
        snapshot.holdingBoosted === expected.holdingBoosted &&
        snapshot.ruleProgress.goalAchieved === expected.ruleProgress.goalAchieved &&
        snapshot.ruleProgress.sealOpened === expected.ruleProgress.sealOpened &&
        sameState(snapshot.state, expected.state);
    });
}

export function validCompletionAudit(saved) {
  if (
    !saved ||
    !["blind", "practice"].includes(saved.mode) ||
    !Number.isInteger(saved.round) ||
    saved.round < 1 ||
    saved.round > STAGES.length ||
    !Number.isInteger(saved.seed) ||
    saved.seed < 0 ||
    saved.seed > 0xffffffff ||
    !Number.isSafeInteger(saved.moves) ||
    saved.moves <= 0 ||
    typeof saved.holdingBoosted !== "boolean" ||
    !validRun(saved.run) ||
    !validAuditShape(saved.audit)
  ) return false;
  const config = levelConfig(saved.mode, saved.round);
  if (
    !validRules(saved.rules, config) ||
    !validRuleProgress(saved.ruleProgress, saved.rules) ||
    !validState(
      saved.state,
      config,
      Number(saved.run.revived),
      Number(saved.holdingBoosted),
    ) ||
    (!releaseConfig.ads.enabled && (
      saved.run.revived || saved.run.rewards.undo || saved.run.rewards.peek
    ))
  ) return false;
  let initial;
  try {
    initial = generateLevel(saved.mode, saved.seed, saved.round);
  } catch {
    return false;
  }
  const baseRun = createRun(initial, saved.run.rule, saved.round);
  return initial.seed === saved.seed &&
    sameRules(saved.rules, initial.rules) &&
    saved.run.limit === baseRun.limit &&
    saved.run.timeLimitMs === baseRun.timeLimitMs &&
    saved.run.remainingMs <= baseRun.timeLimitMs &&
    (saved.run.rule !== "timed" || saved.mode === "practice" || saved.run.clockStarted) &&
    (saved.run.rule === "timed" && saved.mode !== "practice" ||
      saved.run.remainingMs === baseRun.timeLimitMs) &&
    (saved.run.rule !== "timed" || saved.mode === "practice" ||
      saved.run.remainingMs > 0 && saved.run.remainingMs < baseRun.timeLimitMs) &&
    !!replayMatchesSaved(saved, initial, true);
}

export function validSavedGame(saved) {
  if (
    !saved ||
    saved.version !== 3 ||
    !["blind", "practice"].includes(saved.mode) ||
    !Number.isInteger(saved.round) ||
    saved.round < 1 ||
    saved.round > STAGES.length ||
    !Number.isInteger(saved.seed) ||
    saved.seed < 0 ||
    saved.seed > 0xffffffff ||
    !Number.isSafeInteger(saved.moves) ||
    saved.moves < 0 ||
    typeof saved.holdingBoosted !== "boolean" ||
    !validAttemptId(saved.attemptId) ||
    !validRun(saved.run) ||
    !validAuditShape(saved.audit) ||
    !Array.isArray(saved.history) ||
    saved.history.length > 100
  ) return false;
  const config = levelConfig(saved.mode, saved.round);
  if (
    !validRules(saved.rules, config) ||
    !matchesStageRules(saved.rules, config) ||
    !validRuleProgress(saved.ruleProgress, saved.rules)
  ) return false;
  if (!validState(
    saved.state,
    config,
    Number(saved.run.revived),
    Number(saved.holdingBoosted),
  )) return false;
  let initial;
  try {
    initial = generateLevel(saved.mode, saved.seed, saved.round);
  } catch {
    return false;
  }
  if (initial.seed !== saved.seed || !sameRules(saved.rules, initial.rules)) return false;
  const baseRun = createRun(initial, saved.run.rule, saved.round);
  const maxUndo = 3 + Number(saved.run.rewards.undo) * 3;
  const maxPeek = 2 + Number(saved.run.rewards.peek) * 2;
  if (
    saved.run.timeLimitMs !== config.timeLimitMs ||
    saved.run.undo > maxUndo ||
    saved.run.peek > maxPeek ||
    saved.run.remainingMs > config.timeLimitMs + Number(saved.run.revived) * 60000 ||
    (!releaseConfig.ads.enabled && (
      saved.run.revived || saved.run.rewards.undo || saved.run.rewards.peek
    )) ||
    (!saved.run.revived && saved.run.limit !== baseRun.limit) ||
    (saved.run.revived && (
      saved.run.limit < baseRun.limit + 30 ||
      saved.run.limit > Math.max(baseRun.limit, saved.moves) + 30
    )) ||
    (saved.mode === "practice" && !allVisible(saved.state)) ||
    !sealedLaneVisible(saved.state, saved.rules) ||
    (saved.moves === 0 && (
      isWin(saved.state) ||
      saved.ruleProgress.goalAchieved !== initial.progress.goalAchieved ||
      saved.ruleProgress.sealOpened !== initial.progress.sealOpened
    ))
  ) return false;
  const replayed = replayMatchesSaved(saved, initial, isWin(saved.state));
  return !!replayed && historyMatchesReplay(saved, replayed, config);
}
