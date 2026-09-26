/**
 * Adapted from Decanta: Water Sort, src/core/engine.ts and generator.ts.
 * Copyright (c) 2026 Álli Terhorst — MIT (see LICENSE).
 * Source commit: 4130d868bc5eeba65f5de8cf9aec3669c18c78cf.
 * Changes: plain JS, no alchemy/locks/wildcards, one tile per move,
 * hidden-aware completion, mixed-pet stacking; reverse-scramble generator added.
 * Tubes are stored bottom-to-top. Hidden flags never affect tile identity.
 */
import { levelConfig } from "./stage-config.js";

export { STAGES, levelConfig } from "./stage-config.js";

export const MODES = Object.freeze({
  blind: Object.freeze({ hidden: true }),
  practice: Object.freeze({ hidden: false }),
});

export function cloneState(s) {
  const next = { capacity: s.capacity, tubes: s.tubes.map((t) => t.slice()) };
  if (s.hidden) next.hidden = s.hidden.map((h) => h.slice());
  return next;
}
export function topColor(tube) {
  return tube.length === 0 ? null : tube[tube.length - 1];
}
export function isSingleColor(tube) {
  return tube.every((c) => c === tube[0]);
}
export function isTubeDone(tube, capacity) {
  return tube.length === 0 || (tube.length === capacity && isSingleColor(tube));
}
export function canPour(s, from, to) {
  if (from === to || !s.tubes[from] || !s.tubes[to]) return false;
  const src = s.tubes[from],
    dst = s.tubes[to];
  if (!src.length || dst.length >= s.capacity) return false;
  if (s.hidden?.[from]?.[src.length - 1] || s.hidden?.[to]?.[dst.length - 1])
    return false;
  // Any visible top tile may move onto any other column with spare capacity.
  return true;
}
export function applyMove(s, from, to) {
  if (!canPour(s, from, to)) return s;
  const next = cloneState(s);
  const src = next.tubes[from],
    dst = next.tubes[to];
  dst.push(src.pop());
  if (next.hidden) {
    const sh = next.hidden[from];
    sh.length = src.length;
    if (src.length > 0) sh[src.length - 1] = false;
    next.hidden[to].push(false);
  }
  return next;
}
export function legalMoves(s) {
  const moves = [];
  for (let from = 0; from < s.tubes.length; from++) {
    if (s.tubes[from].length === 0) continue;
    for (let to = 0; to < s.tubes.length; to++) {
      if (canPour(s, from, to)) moves.push({ from, to, count: 1 });
    }
  }
  return moves;
}
export function isWin(s) {
  return (
    s.tubes.some((t) => t.length) &&
    s.tubes.every(
      (t, i) => isTubeDone(t, s.capacity) && !s.hidden?.[i]?.some(Boolean),
    )
  );
}
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Every reverse step has an exact legal forward inverse (single-tile moves).
// Return that witness too, so tests can verify every generated board to completion.
export function generateLevel(mode = "blind", seed = 1, round = 1) {
  const cfg = levelConfig(mode, round),
    rng = mulberry32(seed);
  // Try several reversible layouts, keeping the one with most color boundaries.
  // This is a structural mixing heuristic, NOT an optimal-solution difficulty score.
  let best;
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = scramble(cfg, rng);
    if (!best || mixingScore(candidate.state) > mixingScore(best.state))
      best = candidate;
  }
  const s = best.state;
  s.hidden = s.tubes.map((t) =>
    t.map((_, p) => cfg.hidden && p < Math.min(cfg.hiddenDepth, t.length - 1)),
  );
  s.tubes.forEach((t, i) => {
    if (isSingleColor(t)) s.hidden[i].fill(false);
  });
  return best;
}

export function mixingScore(s) {
  return s.tubes.reduce(
    (sum, tube) =>
      sum +
      tube.reduce(
        (n, color, i) => n + Number(i > 0 && color !== tube[i - 1]),
        0,
      ),
    0,
  );
}

function scramble(cfg, rng) {
  const s = {
    capacity: cfg.capacity,
    tubes: Array.from({ length: cfg.colors }, (_, c) =>
      Array(cfg.capacity).fill(c),
    ),
  };
  for (let i = 0; i < cfg.blanks; i++) s.tubes.push([]);
  const reverse = [];
  for (let step = 0; step < cfg.steps; step++) {
    const choices = [];
    s.tubes.forEach((src, from) => {
      if (!src.length) return;
      let run = 1;
      while (run < src.length && src.at(-1 - run) === src.at(-1)) run++;
      // Leave a matching tile behind unless the entire source is uniform.
      // This makes EVERY single-tile forward inverse legal.
      const removable = run === src.length ? run : run - 1;
      if (!removable) return;
      s.tubes.forEach((dst, to) => {
        if (from === to || dst.length === cfg.capacity) return;
        const prev = reverse.at(-1);
        if (prev && prev.from === to && prev.to === from) return;
        const max = Math.min(removable, cfg.capacity - dst.length);
        choices.push({ from, to, max });
      });
    });
    if (!choices.length) break;
    const move = choices[Math.floor(rng() * choices.length)];
    // Multi-tile reverse runs keep a movable top layer alive, allowing deeper
    // interleaving instead of freezing every column after its first intruder.
    const count = 1 + Math.floor(rng() * move.max);
    for (let k = 0; k < count; k++) {
      s.tubes[move.to].push(s.tubes[move.from].pop());
      reverse.push({ from: move.from, to: move.to });
    }
  }
  return {
    state: s,
    solution: reverse.reverse().map(({ from, to }) => ({ from: to, to: from })),
  };
}

export function revealCompleted(s) {
  s.tubes.forEach((t, i) => {
    if (t.length === s.capacity && isSingleColor(t)) s.hidden[i].fill(false);
  });
  return s;
}
