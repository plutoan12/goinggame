import test from "node:test";
import assert from "node:assert/strict";
import { accountRunClock } from "./session.js";
import { pickLocation } from "./pick-controller.js";

const source = { kind: "tube", index: 0 };
const fullTarget = { kind: "tube", index: 1 };
const openTarget = { kind: "tube", index: 2 };

function harness({ started = true, paused = false, dialogOpen = false } = {}) {
  let now = 1_000;
  let locked = false;
  let terminal = false;
  let animationMs = 0;
  let moveSetupMs = 0;
  let renderMs = 0;
  const events = [];
  const context = {
    busy: false,
    paused,
    dialogOpen,
    mode: "blind",
    selected: null,
    lastMove: null,
    state: {
      capacity: 2,
      tubes: [[0, 1], [1, 0], []],
      hidden: [[false, false], [false, false], []],
      holding: [],
    },
    rules: { goalColor: null, marked: [], sealedLane: null, unlockColor: null },
    ruleProgress: { goalAchieved: true, sealOpened: true },
    moves: 0,
    audit: [],
    run: {
      rule: "timed",
      clockStarted: started,
      remainingMs: 10_000,
    },
    clockStamp: started ? 900 : null,
    syncClock() {
      const active = this.run.rule === "timed" &&
        this.mode !== "practice" &&
        this.run.clockStarted &&
        !this.paused &&
        !this.busy &&
        !this.dialogOpen &&
        !terminal;
      ({ run: this.run, clockStamp: this.clockStamp } = accountRunClock(
        this.run,
        this.clockStamp,
        now,
        active,
      ));
      events.push(["sync", now, this.clockStamp]);
    },
    settleClock() {
      ({ run: this.run, clockStamp: this.clockStamp } = accountRunClock(
        this.run,
        this.clockStamp,
        now,
        false,
      ));
      events.push(["settle", now, this.clockStamp]);
    },
    outcome: () => terminal ? "time" : "playing",
    showLoss: () => events.push(["loss"]),
    showWin: () => events.push(["win"]),
    tell: (message, error = false) => events.push(["tell", message, error]),
    render() {
      events.push(["render"]);
      now += renderMs;
      this.syncClock();
    },
    focusLocation: (location) => events.push(["focus", location]),
    locationLocked: () => locked,
    tone: (kind) => events.push(["tone", kind]),
    locationLabel: (location) => `${location.kind}-${location.index}`,
    petName: (color) => `pet-${color}`,
    nudgeLocation: (location) => events.push(["nudge", location]),
    remember() {
      events.push(["remember"]);
      now += moveSetupMs;
    },
    moveElements: () => ({ source: {}, targetRail: {} }),
    setBusy(value) {
      this.busy = value;
      events.push(["busy", value, now]);
    },
    save: () => events.push(["save"]),
    async flyTile() {
      assert.equal(this.busy, true);
      assert.equal(this.clockStamp, null);
      now += animationMs;
      events.push(["animation", now]);
    },
  };
  return {
    context,
    events,
    advance: (milliseconds) => { now += milliseconds; },
    lock: (value = true) => { locked = value; },
    terminal: (value = true) => { terminal = value; },
    animate: (milliseconds, setup = 0, render = 0) => {
      animationMs = milliseconds;
      moveSetupMs = setup;
      renderMs = render;
    },
    now: () => now,
  };
}

test("pick controller keeps active selection, cancellation and rejection time armed", async () => {
  const h = harness();

  await pickLocation(h.context, source);
  assert.deepEqual(h.context.selected, source);
  assert.equal(h.context.run.remainingMs, 9_900);
  assert.equal(h.context.clockStamp, h.now());

  h.advance(40);
  await pickLocation(h.context, source);
  assert.equal(h.context.selected, null);
  assert.equal(h.context.run.remainingMs, 9_860);
  assert.equal(h.context.clockStamp, h.now());

  h.lock();
  h.advance(60);
  await pickLocation(h.context, source);
  assert.equal(h.context.run.remainingMs, 9_800);
  assert.equal(h.context.clockStamp, h.now());

  h.lock(false);
  h.advance(10);
  await pickLocation(h.context, source);
  h.advance(65);
  await pickLocation(h.context, fullTarget);
  assert.deepEqual(h.context.selected, source);
  assert.equal(h.context.run.remainingMs, 9_725);
  assert.equal(h.context.clockStamp, h.now());
  assert.equal(h.events.filter(([event]) => event === "nudge").length, 1);
});

test("successful pick excludes animation time and rearms immediately on completion", async () => {
  const h = harness();
  h.context.selected = source;
  h.animate(400, 75, 125);

  await pickLocation(h.context, openTarget, { left: 1, top: 2 });

  assert.equal(h.context.moves, 1);
  assert.equal(h.context.busy, false);
  assert.equal(h.context.run.remainingMs, 9_700);
  assert.equal(h.context.clockStamp, 1_600);
  assert.deepEqual(h.context.state.tubes, [[0], [1, 0], [1]]);
  assert.deepEqual(h.context.audit, [{ type: "move", from: source, to: openTarget }]);

  h.lock();
  h.advance(100);
  await pickLocation(h.context, source);
  assert.equal(h.context.run.remainingMs, 9_600);
  assert.equal(h.context.clockStamp, h.now());
});

test("pre-start invalid taps and inactive controller states remain disarmed", async () => {
  const fresh = harness({ started: false });
  fresh.lock();
  await pickLocation(fresh.context, source);
  assert.equal(fresh.context.run.clockStarted, false);
  assert.equal(fresh.context.run.remainingMs, 10_000);
  assert.equal(fresh.context.clockStamp, null);
  assert.equal(fresh.context.moves, 0);

  for (const state of ["paused", "dialog", "busy", "terminal"]) {
    const h = harness({
      paused: state === "paused",
      dialogOpen: state === "dialog",
    });
    if (state === "busy") h.context.busy = true;
    if (state === "terminal") h.terminal();
    await pickLocation(h.context, source);
    assert.equal(h.context.clockStamp, null, state);
  }
});
