import { cloneState } from "./engine.js";

export function makeMoveSnapshot({ state, moves, extra, ruleProgress }) {
  return {
    state: cloneState(state),
    moves,
    extra,
    ruleProgress: { ...ruleProgress },
  };
}

export function restoreMoveSnapshot(snapshot) {
  return makeMoveSnapshot(snapshot);
}

export function startGeneratedLevel(current, request, generator) {
  try {
    const level = generator(request.mode, request.seed, request.round);
    return {
      ok: true,
      next: {
        ...current,
        mode: request.mode,
        round: request.round,
        seed: level.seed,
        rule: request.rule,
        state: cloneState(level.state),
        rules: structuredClone(level.rules),
        ruleProgress: { ...level.progress },
        level,
      },
    };
  } catch (error) {
    return { ok: false, current, error };
  }
}
