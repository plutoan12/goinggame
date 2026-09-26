import { isWin, STAGES } from "./engine.js";

export const PROGRESS_KEY = "twelve-guardians-progress-v1";
const tier = (round) => Number.isSafeInteger(round) && round > 0 && round <= STAGES.length
  ? round : null;

// Local sequential progress, shared by journey and practice. Not an anti-cheat server.
export function createProgression(storage) {
  let cleared = 0, storageError = false;
  try {
    const value = JSON.parse(storage.getItem(PROGRESS_KEY));
    if (value?.version === 1 && Number.isInteger(value.cleared) &&
        value.cleared >= 0 && value.cleared <= STAGES.length) cleared = value.cleared;
  } catch { storageError = true; }
  const canAccess = (round) => tier(round) !== null && tier(round) <= Math.min(STAGES.length, cleared + 1);
  return {
    get cleared() { return cleared; },
    get unlocked() { return Math.min(STAGES.length, cleared + 1); },
    get storageError() { return storageError; },
    canAccess,
    complete(round, state) {
      if (!canAccess(round) || tier(round) !== cleared + 1 || !isWin(state)) return false;
      cleared++;
      try {
        storage.setItem(PROGRESS_KEY, JSON.stringify({ version: 1, cleared }));
        storageError = false;
      } catch { storageError = true; }
      return true;
    },
  };
}
