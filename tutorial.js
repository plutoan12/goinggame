import { applyMove, cloneState, isWin } from "./engine.js";

export const TUTORIAL_KEY = "twelve-guardians-tutorial-v1";
const steps = [{ from: 0, to: 2 }, { from: 1, to: 0 }, { from: 2, to: 1 }];
const initial = () => ({
  capacity: 3,
  tubes: [[0, 0, 1], [1, 1, 0], [], []],
  hidden: [[false, false, false], [false, false, false], [], []],
});

// Deliberately owns only tutorial state. Never writes a run, unlock or rank.
export function createTutorial(storage) {
  let state = initial(), step = 0, completed = false, storageError = false;
  try {
    const saved = JSON.parse(storage?.getItem(TUTORIAL_KEY) ?? "null");
    completed = saved?.version === 1 && saved?.completed === true;
  } catch { storageError = true; }
  return {
    get state() { return cloneState(state); },
    get step() { return step; },
    get guide() { return steps[step] ? { ...steps[step] } : null; },
    get done() { return isWin(state); },
    get completed() { return completed; },
    get storageError() { return storageError; },
    canMove(from, to) { return steps[step]?.from === from && steps[step]?.to === to; },
    move(from, to) {
      if (!this.canMove(from, to)) return false;
      state = applyMove(state, from, to);
      step++;
      if (isWin(state)) {
        completed = true;
        try {
          if (!storage) throw Error("Storage unavailable");
          storage.setItem(TUTORIAL_KEY, JSON.stringify({ version: 1, completed: true }));
          storageError = false;
        } catch { storageError = true; }
      }
      return true;
    },
    restart() { state = initial(); step = 0; },
  };
}
