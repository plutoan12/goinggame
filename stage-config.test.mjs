import test from "node:test";
import assert from "node:assert/strict";
import {
  STAGES,
  PET_ORDER,
  levelConfig,
  stageColumns,
  stageGroups,
} from "./stage-config.js";

const flatten = (chapters) => chapters.flat();
const pick = ({ colors, capacity, hiddenDepth, blanks, holdingSlots, timeLimitMs }) => ({
  colors,
  capacity,
  hiddenDepth,
  blanks,
  holdingSlots,
  timeLimitMs,
});

test("sixty stages match the approved difficulty wave", () => {
  assert.equal(STAGES.length, 60);
  assert.deepEqual(STAGES.map((stage) => stage.capacity), flatten([
    [4, 4, 5, 4, 5, 5, 6, 5, 6, 6],
    [6, 6, 7, 6, 7, 7, 8, 7, 8, 8],
    [8, 8, 9, 8, 9, 9, 10, 9, 10, 10],
    [9, 10, 10, 9, 10, 11, 11, 10, 11, 12],
    [10, 11, 11, 10, 12, 12, 13, 11, 13, 14],
    [12, 12, 13, 12, 13, 13, 14, 12, 14, 16],
  ]));
  assert.deepEqual(STAGES.map((stage) => stage.colors), flatten([
    [4, 5, 6, 5, 6, 7, 8, 6, 8, 8],
    [8, 9, 10, 8, 9, 10, 11, 9, 11, 11],
    [10, 11, 12, 10, 11, 12, 12, 10, 12, 14],
    [10, 11, 12, 10, 11, 12, 12, 10, 12, 14],
    [10, 11, 12, 10, 11, 12, 12, 10, 12, 14],
    [10, 11, 12, 10, 11, 12, 12, 10, 12, 14],
  ]));
  assert.deepEqual(STAGES.map((stage) => stage.hiddenDepth), flatten([
    [1, 1, 2, 1, 2, 2, 2, 1, 2, 2],
    [2, 3, 3, 2, 3, 4, 4, 3, 4, 4],
    [4, 5, 5, 4, 5, 6, 6, 5, 7, 7],
    [6, 7, 8, 6, 8, 9, 9, 7, 10, 10],
    [8, 9, 10, 8, 10, 11, 11, 9, 12, 12],
    [11, 11, 12, 10, 12, 12, 13, 11, 13, 15],
  ]));
  assert.deepEqual(STAGES.map((stage) => stage.holdingSlots), flatten([
    [3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    [3, 3, 3, 3, 3, 3, 2, 3, 2, 2],
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    [2, 2, 2, 2, 2, 2, 1, 2, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  ]));
  assert.deepEqual(STAGES.map((stage) => stage.timeLimitMs / 1000), flatten([
    [120, 140, 160, 140, 180, 200, 220, 180, 240, 240],
    [240, 270, 300, 240, 300, 330, 360, 300, 390, 420],
    [300, 330, 360, 300, 390, 420, 450, 360, 480, 540],
    [420, 450, 480, 420, 510, 540, 600, 480, 660, 720],
    [480, 540, 600, 480, 660, 720, 780, 600, 840, 900],
    [600, 660, 720, 600, 780, 840, 900, 720, 900, 1200],
  ]));

  assert.ok(STAGES.every(({ holdingSlots }) =>
    Number.isInteger(holdingSlots) && holdingSlots >= 0 && holdingSlots <= 3));
  assert.deepEqual(pick(STAGES[29]), {
    colors: 14, capacity: 10, hiddenDepth: 7,
    blanks: 2, holdingSlots: 2, timeLimitMs: 540_000,
  });
  assert.deepEqual(pick(STAGES[39]), {
    colors: 14, capacity: 12, hiddenDepth: 10,
    blanks: 2, holdingSlots: 1, timeLimitMs: 720_000,
  });
  assert.deepEqual(pick(STAGES[49]), {
    colors: 14, capacity: 14, hiddenDepth: 12,
    blanks: 2, holdingSlots: 1, timeLimitMs: 900_000,
  });
  assert.deepEqual(pick(STAGES[59]), {
    colors: 14, capacity: 16, hiddenDepth: 15,
    blanks: 1, holdingSlots: 0, timeLimitMs: 1_200_000,
  });
});

test("relief rows and the final boss use their approved blank and holding exceptions", () => {
  for (let stage = 1; stage <= STAGES.length; stage++) {
    const offset = stage % 10;
    const expectedBlanks = stage === 60 ? 1 : offset === 4 || offset === 8 ? 3 : 2;
    assert.equal(STAGES[stage - 1].blanks, expectedBlanks, `stage ${stage}`);
  }
  assert.deepEqual(
    STAGES.map((stage, index) => ({ ...stage, stage: index + 1 }))
      .filter(({ capacity, holdingSlots }) => capacity === 16 || holdingSlots === 0)
      .map(({ stage, capacity, holdingSlots }) => ({ stage, capacity, holdingSlots })),
    [{ stage: 60, capacity: 16, holdingSlots: 0 }],
  );
});

test("all rows expose stage-derived solving and rule metadata", () => {
  for (const [index, stage] of STAGES.entries()) {
    for (const field of ["petOffset", "markedCount", "maxSolutionSteps", "minHiddenRatio"])
      assert.equal(Object.hasOwn(stage, field), true, `stage ${index + 1} ${field}`);
  }
  assert.deepEqual(STAGES.map((stage) => stage.maxSolutionSteps), [
    ...Array(10).fill(80),
    ...Array(10).fill(120),
    ...Array(10).fill(160),
    ...Array(10).fill(200),
    ...Array(10).fill(240),
    ...Array(9).fill(280), 320,
  ]);
  assert.deepEqual(STAGES.map((stage) => stage.minHiddenRatio), [
    ...Array(10).fill(0.10),
    ...Array(10).fill(0.35),
    ...Array(10).fill(0.55),
    ...Array(10).fill(0.65),
    ...Array(10).fill(0.75),
    ...Array(9).fill(0.85), 0.90,
  ]);

  const chapterRules = [
    [], [], [], [], ["goal"], ["marked"], ["sealed"], [],
    ["goal", "marked"], ["goal", "marked", "sealed"],
  ];
  for (let stage = 21; stage <= 60; stage++) {
    const config = STAGES[stage - 1];
    assert.deepEqual(config.ruleKinds, chapterRules[(stage - 1) % 10], `rules/${stage}`);
    const expectedMarked = stage % 10 === 0 ? 2 : config.ruleKinds.includes("marked") ? 1 : 0;
    assert.equal(config.markedCount, expectedMarked, `marks/${stage}`);
  }
  assert.equal(STAGES[10].markedCount, 2);
  assert.equal(STAGES[11].markedCount, 2);
});

test("late ordinary casts rotate while bosses contain every pet", () => {
  assert.deepEqual(PET_ORDER, [12, 13, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  const first = levelConfig("blind", 31);
  const rotated = levelConfig("blind", 34);
  assert.equal(first.colors, rotated.colors);
  assert.notDeepEqual(first.petIds, rotated.petIds);
  for (const config of [first, rotated]) {
    assert.ok(config.petIds.includes(12));
    assert.ok(config.petIds.includes(13));
    assert.equal(new Set(config.petIds).size, config.colors);
  }
  for (const stage of [30, 40, 50, 60]) {
    const config = levelConfig("blind", stage);
    assert.equal(config.petIds.length, PET_ORDER.length);
    assert.deepEqual(new Set(config.petIds), new Set(PET_ORDER));
  }
});

test("level config preserves catalog fields and clamps to the sixty-stage journey", () => {
  const config = levelConfig("blind", 60);
  for (const field of [
    "name", "colors", "capacity", "hiddenDepth", "blanks", "holdingSlots",
    "petOffset", "ruleKinds", "markedCount", "timeLimitMs", "maxSolutionSteps",
    "minHiddenRatio",
  ]) assert.deepEqual(config[field], STAGES[59][field], field);
  assert.equal(config.tier, 60);
  assert.equal(stageColumns(config), 15);
  assert.equal(config.steps, 1200);
  assert.equal(config.hidden, true);
  assert.equal(levelConfig("practice", 60).hidden, false);
  assert.equal(levelConfig("blind", 999).tier, 60);
});

test("stage picker exposes six numbered groups of ten", () => {
  assert.deepEqual(stageGroups(), [
    { start: 1, end: 10, label: "1~10단계" },
    { start: 11, end: 20, label: "11~20단계" },
    { start: 21, end: 30, label: "21~30단계" },
    { start: 31, end: 40, label: "31~40단계" },
    { start: 41, end: 50, label: "41~50단계" },
    { start: 51, end: 60, label: "51~60단계" },
  ]);
});

test("legacy names remain through stage nineteen and the final title stays unique", () => {
  assert.deepEqual(STAGES.slice(0, 19).map((stage) => stage.name), [
    "첫걸음", "햇살길", "꽃들판", "솔숲길", "별빛뜰",
    "달맞이", "구름재", "바람고개", "수호숲", "수호문",
    "푸른마루", "별마루", "새벽뜰", "달그늘", "구름마당",
    "바람마루", "수호길", "별길", "마지막 고개",
  ]);
  assert.equal(STAGES[59].name, "열두 퍼즐");
  assert.equal(new Set(STAGES.map((stage) => stage.name)).size, STAGES.length);
});
