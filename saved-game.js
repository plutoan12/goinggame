import { validRules, validRuleProgress } from "./rules.js";
import { validRun } from "./session.js";
import { levelConfig, STAGES } from "./stage-config.js";

export const SAVE_KEY = "twelve-puzzle-game-v1";

export function validState(state, config, addedLanes = 0) {
  if (
    !state ||
    state.capacity !== config.capacity ||
    !Number.isInteger(addedLanes) ||
    addedLanes < 0 ||
    !Array.isArray(state.tubes) ||
    state.tubes.length !== config.colors + config.blanks + addedLanes ||
    !Array.isArray(state.hidden) ||
    state.hidden.length !== state.tubes.length
  ) return false;
  const counts = Array(config.colors).fill(0);
  const validLanes = state.tubes.every((tube, lane) =>
    Array.isArray(tube) &&
    tube.length <= config.capacity &&
    Array.isArray(state.hidden[lane]) &&
    state.hidden[lane].length === tube.length &&
    state.hidden[lane].every((hidden) => typeof hidden === "boolean") &&
    !state.hidden[lane].at(-1) &&
    tube.every((color) =>
      Number.isInteger(color) &&
      color >= 0 &&
      color < config.colors &&
      ++counts[color]
    )
  );
  return validLanes && counts.every((count) => count === config.capacity);
}

function validAttemptId(id) {
  return typeof id === "string" && /^[a-zA-Z0-9-]{1,80}$/.test(id);
}

function validSnapshot(snapshot, config, rules, revived) {
  return !!snapshot &&
    Number.isSafeInteger(snapshot.moves) && snapshot.moves >= 0 &&
    typeof snapshot.extra === "boolean" &&
    validRuleProgress(snapshot.ruleProgress, rules) &&
    validState(snapshot.state, config, Number(snapshot.extra) + Number(revived));
}

function matchesStageRules(rules, config) {
  const has = (kind) => config.ruleKinds.includes(kind);
  const expectedMarks = has("marked")
    ? (config.tier === 11 || config.tier === 12 ? 2 : 1)
    : 0;
  return (rules.goalColor !== null) === has("goal") &&
    rules.marked.length === expectedMarks &&
    (rules.sealedLane !== null) === has("sealed");
}

export function validSavedGame(saved) {
  if (
    !saved ||
    saved.version !== 1 ||
    !["blind", "practice"].includes(saved.mode) ||
    !Number.isInteger(saved.round) ||
    saved.round < 1 ||
    saved.round > STAGES.length ||
    !Number.isInteger(saved.seed) ||
    saved.seed < 0 ||
    saved.seed > 0xffffffff ||
    !Number.isSafeInteger(saved.moves) ||
    saved.moves < 0 ||
    typeof saved.extra !== "boolean" ||
    !validAttemptId(saved.attemptId) ||
    !validRun(saved.run) ||
    !Array.isArray(saved.history) ||
    saved.history.length > 100
  ) return false;
  const config = levelConfig(saved.mode, saved.round);
  if (
    !validRules(saved.rules, config) ||
    !matchesStageRules(saved.rules, config) ||
    !validRuleProgress(saved.ruleProgress, saved.rules)
  ) return false;
  if (!validState(saved.state, config, Number(saved.extra) + Number(saved.run.revived))) return false;
  return saved.history.every((snapshot) =>
    validSnapshot(snapshot, config, saved.rules, saved.run.revived)
  );
}
