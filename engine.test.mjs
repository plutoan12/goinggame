import test from "node:test";
import assert from "node:assert/strict";
import { GUARDIANS } from "./guardians.js";
import {
  applyTransfer,
  applyMove,
  canPour,
  canTransfer,
  cloneState,
  generateLevel,
  holding,
  isWin,
  legalTransfers,
  legalMoves,
  MODES,
  STAGES,
  levelConfig,
  mixingScore,
  revealCompleted,
  topAt,
  tube,
} from "./engine.js";

const sample = () => ({
  capacity: 3,
  tubes: [[1, 0], [0], []],
  hidden: [[true, false], [false], []],
});
test("twelve guardians plus cat and chick have distinct identities", () => {
  assert.equal(new Set(GUARDIANS.map((p) => p[0])).size, 14);
  assert.deepEqual(
    GUARDIANS.slice(12).map((p) => p[1]),
    ["고양이", "병아리"],
  );
  assert.deepEqual(
    GUARDIANS.slice(0, 12).map((p) => p[1]),
    [
      "쥐",
      "소",
      "호랑이",
      "토끼",
      "용",
      "뱀",
      "말",
      "양",
      "원숭이",
      "닭",
      "개",
      "돼지",
    ],
  );
});
test("same pet, different pet and empty destinations allowed; full columns rejected", () => {
  const s = sample();
  assert.equal(canPour(s, 0, 1), true);
  assert.equal(canPour(s, 0, 2), true);
  assert.equal(canPour(s, 0, 0), false);
  assert.equal(canPour(s, -1, 2), false);
  assert.equal(applyMove(s, 2, 0), s);
  s.tubes[1] = [1];
  assert.equal(canPour(s, 0, 1), true);
  const moved = applyMove(s, 0, 1);
  assert.deepEqual(moved.tubes, [[1], [1, 0], []]);
  assert.deepEqual(moved.hidden, [[false], [false, false], []]);
  assert.ok(legalMoves(s).some(({ from, to }) => from === 0 && to === 1));
  s.tubes[1] = [0, 0, 0];
  assert.equal(canPour(s, 0, 1), false);
  assert.equal(applyMove(s, 0, 1), s);
});
test("hidden top tiles stay protected even with mixed-pet stacking", () => {
  const s = sample();
  s.hidden[0][1] = true;
  assert.equal(canPour(s, 0, 1), false);
  s.hidden[0][1] = false;
  s.hidden[1][0] = true;
  assert.equal(canPour(s, 0, 1), false);
});
test("one tile moves, newly exposed tile flips, input and undo snapshot unchanged", () => {
  const s = sample(),
    snapshot = cloneState(s),
    n = applyMove(s, 0, 1);
  assert.deepEqual(s, snapshot);
  assert.deepEqual(n.tubes, [[1], [0, 0], []]);
  assert.deepEqual(n.hidden, [[false], [false, false], []]);
  n.tubes[0].push(2);
  assert.deepEqual(s, snapshot);
});
test("location transfers support tube and holding pairs without mutating input", () => {
  const state = { ...sample(), holding: [null, null] };
  const original = structuredClone(state);

  assert.deepEqual(tube(1), { kind: "tube", index: 1 });
  assert.deepEqual(holding(0), { kind: "holding", index: 0 });
  assert.equal(topAt(state, tube(0)), 0);
  assert.equal(topAt(state, holding(0)), null);
  assert.equal(canTransfer(state, tube(0), tube(1)), true);
  assert.equal(canTransfer(state, tube(0), holding(0)), true);

  const stored = applyTransfer(state, tube(0), holding(0));
  assert.equal(stored.holding[0], 0);
  assert.equal(stored.hidden[0].at(-1), false);
  assert.deepEqual(state, original);

  const returned = applyTransfer(stored, holding(0), tube(2));
  assert.equal(returned.holding[0], null);
  assert.deepEqual(returned.tubes[2], [0]);
  assert.deepEqual(returned.hidden[2], [false]);
});
test("location transfers reject invalid pairs, occupied holding, hidden sources and bad locations", () => {
  const state = { ...sample(), holding: [2, null] };
  const malformed = [
    null,
    0,
    { kind: "tube", index: -1 },
    { kind: "tube", index: 1.5 },
    { kind: "tube", index: 99 },
    { kind: "holding", index: 99 },
    { kind: "other", index: 0 },
    { kind: "tube", index: 0, extra: true },
  ];
  assert.equal(canTransfer(state, holding(0), holding(1)), false);
  assert.equal(canTransfer(state, tube(0), holding(0)), false);
  for (const location of malformed) {
    assert.equal(canTransfer(state, location, tube(2)), false);
    assert.equal(canTransfer(state, tube(0), location), false);
    assert.equal(topAt(state, location), null);
  }
  const hiddenSource = structuredClone(state);
  hiddenSource.hidden[0][1] = true;
  assert.equal(canTransfer(hiddenSource, tube(0), holding(1)), false);
  assert.equal(applyTransfer(hiddenSource, tube(0), holding(1)), hiddenSource);
});
test("legal transfers include both holding directions and occupied holding prevents a win", () => {
  const state = {
    capacity: 2,
    tubes: [[0, 0], [], []],
    hidden: [[false, false], [], []],
    holding: [1, null],
  };
  const transfers = legalTransfers(state);
  assert.ok(transfers.some(({ from, to, count }) =>
    count === 1 && from.kind === "tube" && from.index === 0 &&
    to.kind === "holding" && to.index === 1));
  assert.ok(transfers.some(({ from, to, count }) =>
    count === 1 && from.kind === "holding" && from.index === 0 &&
    to.kind === "tube" && to.index === 1));
  assert.equal(isWin(state), false);
  assert.equal(isWin({ ...state, holding: [null, null] }), true);
});
test("three matching pets remain; completion needs a full column and no hidden tiles", () => {
  const s = {
    capacity: 4,
    tubes: [[0, 0], [0], [0]],
    hidden: [[false, false], [false], [false]],
  };
  const n = applyMove(s, 1, 0);
  assert.equal(n.tubes[0].length, 3);
  assert.equal(isWin(n), false);
  assert.equal(isWin(applyMove(n, 2, 0)), true);
  assert.equal(isWin({ capacity: 4, tubes: [[]], hidden: [[]] }), false);
});
test("generation deterministic and seed-dependent", () => {
  assert.deepEqual(generateLevel("blind", 42), generateLevel("blind", 42));
  assert.notDeepEqual(
    generateLevel("blind", 42).state,
    generateLevel("blind", 43).state,
  );
});
test("stage catalog boards in both modes solve via their witness", () => {
  for (const mode of Object.keys(MODES))
    for (let round = 1; round <= STAGES.length; round++)
      for (let seed = 1; seed <= 5; seed++) {
        const cfg = levelConfig(mode, round),
          level = generateLevel(mode, seed, round);
        let s = level.state;
        assert.equal(isWin(s), false, `${mode} ${seed} must not start solved`);
        assert.ok(legalMoves(s).length);
        const counts = Array(cfg.colors).fill(0);
        s.tubes.flat().forEach((c) => counts[c]++);
        assert.ok(counts.every((n) => n === cfg.capacity));
        for (const { from, to } of level.solution) {
          assert.ok(canPour(s, from, to), `${mode} ${seed}: ${from} → ${to}`);
          s = revealCompleted(applyMove(s, from, to));
          s.tubes.forEach((t, i) => {
            assert.ok(t.length <= cfg.capacity);
            assert.equal(t.length, s.hidden[i].length);
          });
        }
        assert.ok(isWin(s), `${mode} ${seed} must finish`);
      }
});
test("generated geometry follows the approved sixty-stage wave and milestones", () => {
  const milestones = new Map([
    [30, { colors: 14, capacity: 10, blanks: 2, holdingSlots: 2 }],
    [40, { colors: 14, capacity: 12, blanks: 2, holdingSlots: 1 }],
    [50, { colors: 14, capacity: 14, blanks: 2, holdingSlots: 1 }],
    [60, { colors: 14, capacity: 16, blanks: 1, holdingSlots: 0 }],
  ]);
  for (let round = 1; round <= STAGES.length; round++) {
    const cfg = levelConfig("blind", round);
    assert.ok(cfg.petIds.includes(12) && cfg.petIds.includes(13));
    assert.equal(new Set(cfg.petIds).size, cfg.colors);
    const { state } = generateLevel("blind", 26491, round);
    assert.ok(mixingScore(state) >= cfg.colors * 2);
    assert.equal(state.tubes.length, cfg.colors + cfg.blanks);
    assert.equal(state.capacity, cfg.capacity);
    assert.ok(state.hidden.every((h) => !h.at(-1)));
    if (round === 1) assert.ok(state.hidden.flat().some(Boolean));
    const practice = generateLevel("practice", 26491, round).state;
    assert.ok(practice.hidden.flat().every((h) => !h));
    if (milestones.has(round)) {
      const { colors, capacity, blanks, holdingSlots } = cfg;
      assert.deepEqual(
        { colors, capacity, blanks, holdingSlots },
        milestones.get(round),
      );
    }
  }
  for (const round of [4, 8, 14, 18, 24, 28, 34, 38, 44, 48, 54, 58]) {
    const previous = levelConfig("blind", round - 1);
    const relief = levelConfig("blind", round);
    assert.ok(relief.capacity <= previous.capacity, `capacity/${round}`);
    assert.equal(relief.blanks, 3, `blanks/${round}`);
  }
  assert.deepEqual(levelConfig("blind", 999), levelConfig("blind", 60));
  assert.equal(levelConfig("blind", NaN).tier, 1);
});
test("extra lane supports moves and can be undone via snapshot", () => {
  const before = sample(),
    saved = cloneState(before),
    next = cloneState(before);
  next.tubes.push([]);
  next.hidden.push([]);
  assert.ok(canPour(next, 0, 3));
  assert.equal(applyMove(next, 0, 3).tubes[3].length, 1);
  assert.deepEqual(saved, before);
});
test("chapter bosses grow to the unique sixteen-by-fourteen final board", () => {
  const milestones = [
    [10, 48],
    [20, 88],
    [30, 140],
    [40, 168],
    [50, 196],
    [60, 224],
  ];
  for (const [round, total] of milestones) {
    const level = generateLevel("blind", 26491, round);
    assert.equal(level.state.tubes.flat().length, total);
    let state = level.state;
    for (const move of level.solution) state = revealCompleted(applyMove(state, move.from, move.to));
    assert.equal(isWin(state), true);
  }
});
