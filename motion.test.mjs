import test from "node:test";
import assert from "node:assert/strict";
import { flightPath, flyTile, nudge, reducedMotion } from "./motion.js";

test("flight begins at source and ends exactly at destination", () => {
  const frames = flightPath({ left: 40, top: 200 }, { left: 240, top: 150 });
  assert.equal(frames[0].transform, "translate(0, 0) scale(1)");
  assert.equal(frames[2].transform, "translate(200px, -50px) scale(1)");
  assert.ok(frames[1].transform.includes("-102px"));
});
test("flight can travel left and down without invalid geometry", () => {
  const frames = flightPath({ left: 240, top: 150 }, { left: 40, top: 250 });
  assert.equal(frames[2].transform, "translate(-200px, 100px) scale(1)");
});
test("missing DOM targets safely skip presentation", async () => {
  assert.equal(reducedMotion(), false);
  await assert.doesNotReject(flyTile(null, null));
});
test("flight renders inside an open dialog and removes its ghost after arrival", async () => {
  const oldDoc = globalThis.document, oldStyle = globalThis.getComputedStyle;
  const appended = [];
  let removed = false;
  let timing;
  const dialog = { append: (node) => appended.push(["dialog", node]) };
  const ghost = { style: {}, setAttribute() {}, animate: (_frames, options) => {
    timing = options;
    return { finished: Promise.resolve() };
  }, remove() { removed = true; } };
  const source = { style: {}, animate() {}, closest: () => dialog, cloneNode: () => ghost,
    getBoundingClientRect: () => ({ left: 10, top: 10, width: 40, height: 40 }) };
  const rail = { querySelector: () => null, getBoundingClientRect: () => ({ left: 100, bottom: 200 }) };
  globalThis.document = { body: { append: (node) => appended.push(["body", node]) } };
  globalThis.getComputedStyle = () => ({ borderLeftWidth: "1", paddingLeft: "3", borderBottomWidth: "1", paddingBottom: "5" });
  try {
    await flyTile(source, rail);
    assert.equal(appended[0][0], "dialog");
    assert.equal(removed, true);
    assert.equal(source.style.visibility, "");
    assert.ok(timing.duration <= 300, "a tile transfer stays brief");
    assert.equal(timing.delay ?? 0, 0);
  } finally {
    if (oldDoc) globalThis.document = oldDoc; else delete globalThis.document;
    if (oldStyle) globalThis.getComputedStyle = oldStyle; else delete globalThis.getComputedStyle;
  }
});
test("reduced-motion preference skips flight without touching DOM", async () => {
  const previous = globalThis.matchMedia;
  globalThis.matchMedia = () => ({ matches: true });
  try {
    assert.equal(reducedMotion(), true);
    await assert.doesNotReject(flyTile({}, {}));
  } finally {
    if (previous) globalThis.matchMedia = previous;
    else delete globalThis.matchMedia;
  }
});

test("invalid-move cue has a non-color state and clears after its short nudge", async () => {
  let resolveFinished;
  const classes = new Set();
  const element = {
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
    },
    animate(_frames, options) {
      assert.ok(options.duration <= 220, "invalid feedback stays restrained");
      return { finished: new Promise((resolve) => { resolveFinished = resolve; }) };
    },
  };

  const animation = nudge(element);
  assert.equal(classes.has("invalid-target"), true);
  resolveFinished();
  await animation.finished;
  await Promise.resolve();
  assert.equal(classes.has("invalid-target"), false);
});

test("reduced motion applies the invalid-move final state immediately", () => {
  const previous = globalThis.matchMedia;
  const classes = new Set();
  globalThis.matchMedia = () => ({ matches: true });
  try {
    const result = nudge({
      classList: {
        add: (name) => classes.add(name),
        remove: (name) => classes.delete(name),
      },
      animate() {
        assert.fail("reduced motion must not start an animation");
      },
    });
    assert.equal(result, undefined);
    assert.deepEqual([...classes], []);
  } finally {
    if (previous) globalThis.matchMedia = previous;
    else delete globalThis.matchMedia;
  }
});
