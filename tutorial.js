import { applyTransfer, cloneState, holding, isWin, tube } from "./engine.js";

export const TUTORIAL_KEY = "twelve-puzzle-tutorial-v2";
const steps = [
  { from: tube(0), to: holding(0) },
  { from: tube(1), to: tube(0) },
  { from: holding(0), to: tube(1) },
];
const initial = () => ({
  capacity: 3,
  tubes: [[0, 0, 1], [1, 1, 0], [], []],
  hidden: [[false, false, false], [false, false, false], [], []],
  holding: [null],
});
const sameLocation = (left, right) =>
  left?.kind === right?.kind && left?.index === right?.index;

// Deliberately owns only tutorial state. Never writes a run, unlock or rank.
export function createTutorial(storage) {
  let state = initial(), step = 0, completed = false, storageError = false;
  try {
    const saved = JSON.parse(storage?.getItem(TUTORIAL_KEY) ?? "null");
    completed = saved?.version === 2 && saved?.completed === true;
  } catch { storageError = true; }
  return {
    get state() { return cloneState(state); },
    get step() { return step; },
    get guide() {
      return steps[step]
        ? { from: { ...steps[step].from }, to: { ...steps[step].to } }
        : null;
    },
    get done() { return isWin(state); },
    get completed() { return completed; },
    get storageError() { return storageError; },
    canMove(from, to) {
      return sameLocation(steps[step]?.from, from) && sameLocation(steps[step]?.to, to);
    },
    move(from, to) {
      if (!this.canMove(from, to)) return false;
      state = applyTransfer(state, from, to);
      step++;
      if (isWin(state)) {
        completed = true;
        try {
          if (!storage) throw Error("Storage unavailable");
          storage.setItem(TUTORIAL_KEY, JSON.stringify({ version: 2, completed: true }));
          storageError = false;
        } catch { storageError = true; }
      }
      return true;
    },
    restart() { state = initial(); step = 0; },
  };
}
