import test from "node:test";
import assert from "node:assert/strict";
import * as session from "./session.js";
import {
  addHoldingSlot,
  createRun,
  validRun,
  outcome,
  consumeItem,
  revealLane,
  grantReward,
  elapse,
  formatTime,
} from "./session.js";
import { applyMove, holding, revealCompleted, tube } from "./engine.js";
import { applyRuleTransfer, initialRuleProgress, legalRuleTransfers } from "./rules.js";
import { compactSolution, generateLevel } from "./level-generator.js";
import { createAdService } from "./ads.js";

const playing = {
  capacity: 2,
  tubes: [[0, 1], [1, 0], []],
  hidden: [[false, false], [false, false], []],
};
const blocked = {
  capacity: 2,
  tubes: [
    [0, 1],
    [1, 2],
    [2, 0],
  ],
  hidden: [
    [false, false],
    [false, false],
    [false, false],
  ],
};
const won = {
  capacity: 2,
  tubes: [[0, 0], [1, 1], []],
  hidden: [[false, false], [false, false], []],
};
const fresh = () => createRun(generateLevel("blind", 26491, 1));

test("game-over: exhausted moves, actual deadlock, win precedence, unlimited practice", () => {
  const run = fresh();
  assert.equal(outcome(playing, 0, run, "blind"), "playing");
  assert.equal(outcome(playing, run.limit, run, "blind"), "moves");
  assert.equal(outcome(blocked, 0, run, "blind"), "blocked");
  // Mismatched top pets are no longer a deadlock if there is space.
  assert.equal(outcome({ ...blocked, capacity: 3 }, 0, run, "blind"), "playing");
  assert.equal(outcome(won, run.limit, run, "blind"), "won");
  assert.equal(outcome(blocked, run.limit + 10, run, "practice"), "playing");
});
test("a final holding transfer wins before the last move is declared exhausted", () => {
  const rules = { goalColor: 0, marked: [], sealedLane: null, unlockColor: null };
  const progress = initialRuleProgress(rules);
  const before = {
    capacity: 2,
    tubes: [[0], [1, 1]],
    hidden: [[false], [false, false]],
    holding: [0],
  };
  const completed = applyRuleTransfer(before, holding(0), tube(0), rules, progress);
  const run = { ...fresh(), limit: 1 };

  assert.equal(
    outcome(
      completed.state,
      1,
      run,
      "blind",
      (state) => legalRuleTransfers(state, rules, completed.progress),
    ),
    "won",
  );
});
test("a full holding tray is playable when its pet has a tube destination", () => {
  const board = {
    capacity: 2,
    tubes: [[0]],
    hidden: [[false]],
    holding: [1],
  };
  assert.equal(outcome(board, 0, fresh(), "blind"), "playing");
});
test("known solution fits budget at every stage, including last-move success", () => {
  for (let stage = 1; stage <= 20; stage++)
    for (let seed = 0; seed < 5; seed++) {
      const level = generateLevel("blind", seed, stage),
        run = createRun(level);
      assert.ok(validRun(run));
      const solution = compactSolution(level);
      assert.ok(solution.length <= level.solution.length);
      assert.ok(run.limit >= solution.length);
      let state = level.state;
      for (const move of solution) {
        const next = applyMove(state, move.from, move.to);
        assert.notEqual(next, state);
        state = revealCompleted(next);
      }
      assert.equal(outcome(state, solution.length, run, "blind"), "won");
    }
});
test("loop-erased witness makes limits meaningful without impossible budgets", () => {
  const level = generateLevel("blind", 26491, 5);
  const compact = compactSolution(level);
  assert.ok(level.solution.length >= compact.length);
  assert.ok(compact.length > 0);
  assert.ok(createRun(level).limit >= compact.length);
});
test("timed run starts only on first move, elapsed time clamps, moves are unlimited", () => {
  let run = createRun(generateLevel("blind", 5, 1), "timed", 1);
  assert.equal(run.remainingMs, 120000);
  assert.equal(elapse(run, 1000), run);
  run.clockStarted = true;
  run = elapse(run, 119500);
  assert.equal(formatTime(run.remainingMs), "0:01");
  assert.equal(outcome(playing, run.limit + 100, run, "blind"), "playing");
  assert.equal(elapse(run, -1000), run);
  run = elapse(run, 501);
  assert.equal(run.remainingMs, 0);
  assert.equal(outcome(playing, 0, run, "blind"), "time");
  assert.equal(outcome(playing, 0, run, "practice"), "playing");
  assert.equal(formatTime(run.remainingMs), "0:00");
  run = grantReward(run, "revive", 0);
  assert.equal(run.remainingMs, 60000);
  assert.ok(validRun(JSON.parse(JSON.stringify(run))));
  assert.equal(grantReward(run, "revive", 0), null);
});
test("repeated active gesture eligibility checks preserve every timed interval", () => {
  assert.equal(typeof session.accountRunClock, "function");
  if (typeof session.accountRunClock !== "function") return;

  let run = createRun(generateLevel("blind", 5, 1), "timed", 1);
  run.clockStarted = true;
  let clockStamp = 1_000;
  ({ run, clockStamp } = session.accountRunClock(run, clockStamp, 1_125, true));
  assert.equal(run.remainingMs, 119_875);
  assert.equal(clockStamp, 1_125);
  ({ run, clockStamp } = session.accountRunClock(run, clockStamp, 1_400, true));
  assert.equal(run.remainingMs, 119_600);
  assert.equal(clockStamp, 1_400);
  ({ run, clockStamp } = session.accountRunClock(run, clockStamp, 1_900, true));
  assert.equal(run.remainingMs, 119_100);
  assert.equal(clockStamp, 1_900);

  const neverStarted = createRun(generateLevel("blind", 5, 1), "timed", 1);
  const invalidGesture = session.accountRunClock(neverStarted, null, 2_000, true);
  assert.equal(invalidGesture.run.remainingMs, neverStarted.remainingMs);
  assert.equal(invalidGesture.run.clockStarted, false);
  assert.equal(invalidGesture.clockStamp, null);
});
test("timer stage durations and validation", () => {
  const level = generateLevel("blind", 6, 1);
  for (const [index, seconds] of [
    120, 140, 160, 140, 180, 200, 220, 180, 240, 240,
    240, 270, 300, 240, 300, 330, 360, 300, 390, 420,
    300, 330, 360, 300, 390, 420, 450, 360, 480, 540,
    420, 450, 480, 420, 510, 540, 600, 480, 660, 720,
    480, 540, 600, 480, 660, 720, 780, 600, 840, 900,
    600, 660, 720, 600, 780, 840, 900, 720, 900, 1200,
  ].entries()) {
    const run = createRun(level, "timed", index + 1);
    assert.equal(run.remainingMs, seconds * 1000);
    assert.ok(validRun(run));
    assert.equal(validRun({ ...run, remainingMs: -1 }), false);
  }
  assert.equal(formatTime(150000), "2:30");
});
test("timed-out runs do not offer an unusable return-to-items action", () => {
  assert.equal(session.canReturnToItemsAfterLoss?.("time", {}), false);
  assert.equal(session.canReturnToItemsAfterLoss?.("moves", {
    historyLength: 1, undo: 1, holdingBoosted: false,
  }), true);
  assert.equal(session.canReturnToItemsAfterLoss?.("moves", {
    historyLength: 0, undo: 3, holdingBoosted: false,
  }), false);
});
test("blocked runs return to items only when undo or an unused holding slot creates a move", () => {
  const immovable = {
    capacity: 2,
    tubes: [[0]],
    hidden: [[true]],
    holding: [],
  };
  const rescuable = {
    capacity: 2,
    tubes: [[0]],
    hidden: [[false]],
    holding: [],
  };
  const options = {
    historyLength: 0,
    undo: 0,
    holdingBoosted: false,
  };

  assert.equal(session.canReturnToItemsAfterLoss("blocked", {
    ...options,
    state: immovable,
  }), false);
  assert.equal(session.canReturnToItemsAfterLoss("blocked", {
    ...options,
    state: rescuable,
  }), true);
  assert.equal(session.canReturnToItemsAfterLoss("blocked", {
    ...options,
    state: rescuable,
    holdingBoosted: true,
  }), false);
  assert.equal(session.canReturnToItemsAfterLoss("blocked", {
    ...options,
    state: immovable,
    historyLength: 1,
    undo: 1,
  }), true);
});
test("the holding item appends exactly one slot, including at base zero, without extending limits", () => {
  const state = {
    capacity: 2,
    tubes: [[0], [1, 1]],
    hidden: [[false], [false, false]],
    holding: [],
  };
  const run = { ...fresh(), rule: "moves", limit: 1 };
  const boosted = addHoldingSlot(state);

  assert.deepEqual(boosted.holding, [null]);
  assert.deepEqual(state.holding, []);
  assert.deepEqual(addHoldingSlot({ ...state, holding: [1] }).holding, [1, null]);
  assert.equal(outcome(boosted, 1, run, "blind"), "moves");

  const timedOut = { ...run, rule: "timed", remainingMs: 0 };
  assert.equal(outcome(boosted, 0, timedOut, "blind"), "time");
});
test("items deplete, cannot go negative, practice is unlimited, reveal is immutable", () => {
  let run = fresh();
  for (let i = 0; i < 3; i++) run = consumeItem(run, "undo", "blind");
  assert.equal(consumeItem(run, "undo", "blind"), null);
  assert.equal(consumeItem(run, "undo", "practice").undo, 0);
  const hidden = structuredClone(playing);
  hidden.hidden[0][0] = true;
  const next = revealLane(hidden, 0);
  assert.equal(next.hidden[0][0], false);
  assert.equal(hidden.hidden[0][0], true);
  assert.equal(revealLane(hidden, 2), hidden);
});
test("reward caps survive serialization, revive restores moves only once", () => {
  let run = fresh();
  run = grantReward(run, "undo", 0);
  assert.equal(run.undo, 6);
  assert.equal(grantReward(JSON.parse(JSON.stringify(run)), "undo", 0), null);
  run = grantReward(run, "peek", 0);
  assert.equal(run.peek, 4);
  assert.equal(grantReward(run, "peek", 0), null);
  const previous = run.limit;
  run = grantReward(run, "revive", previous);
  assert.equal(run.limit, previous + 30);
  assert.equal(grantReward(run, "revive", previous), null);
  assert.ok(validRun(run));
  assert.equal(validRun({ ...run, undo: -1 }), false);
  assert.equal(validRun({ ...run, limit: null }), false);
});
test("ad service: no default reward, cancellation, failure and earned only", async () => {
  assert.equal(await createAdService().rewarded("undo"), "unavailable");
  for (const result of ["earned", "cancelled", "unavailable", "dismissed"]) {
    const ads = createAdService(async () => result);
    assert.equal(
      await ads.rewarded("undo"),
      result === "dismissed" ? "unavailable" : result,
    );
  }
  assert.equal(
    await createAdService(async () => {
      throw Error("offline");
    }).rewarded("undo"),
    "unavailable",
  );
});
test("ad service disallows overlapping requests and recovers afterwards", async () => {
  let finish;
  const ads = createAdService(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const pending = ads.rewarded("undo");
  assert.equal(await ads.rewarded("peek"), "busy");
  finish("cancelled");
  assert.equal(await pending, "cancelled");
  const again = ads.rewarded("undo");
  finish("earned");
  assert.equal(await again, "earned");
});
