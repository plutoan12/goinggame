import { generateLevel, isWin } from "./engine.js";
import { createRun } from "./session.js";

export function validState(s, cfg, added) {
  if (!s || s.capacity !== cfg.capacity || !Array.isArray(s.tubes) ||
      s.tubes.length !== cfg.colors + cfg.blanks + Number(added)) return false;
  if (!Array.isArray(s.hidden) || s.hidden.length !== s.tubes.length) return false;
  const counts = Array(cfg.colors).fill(0);
  return s.tubes.every((t, i) =>
    Array.isArray(t) && t.length <= cfg.capacity &&
    Array.isArray(s.hidden[i]) && s.hidden[i].length === t.length &&
    s.hidden[i].every((h) => typeof h === "boolean") && !s.hidden[i].at(-1) &&
    t.every((c) => Number.isInteger(c) && c >= 0 && c < cfg.colors && ++counts[c])
  ) && counts.every((n) => n === cfg.capacity);
}

// The original localStorage key is never overwritten. Main scalar/progress
// validation runs before this adapter, and current-shape validation after it.
export function shortenEarlySave(saved) {
  const legacy = saved.round === 1 ? { colors: 6, capacity: 8, blanks: 2 }
    : saved.round === 2 ? { colors: 8, capacity: 10, blanks: 2 } : null;
  if (!legacy || !validState(saved.state, legacy, Number(saved.extra) + Number(saved.run?.revived || false)))
    return { saved, shortened: false };
  const level = generateLevel(saved.mode, saved.seed, saved.round);
  return {
    shortened: true,
    wasComplete: isWin(saved.state),
    saved: {
      ...saved, state: level.state, moves: 0, extra: false, history: [],
      attemptId: undefined,
      run: createRun(level, saved.run?.rule || "moves", saved.round),
    },
  };
}
