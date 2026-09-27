import test from "node:test";
import assert from "node:assert/strict";
import { STAGES, PET_ORDER, levelConfig, stageColumns } from "./stage-config.js";

test("twenty stages match the approved size and rule table", () => {
  assert.equal(STAGES.length, 20);
  assert.deepEqual(STAGES.map(({ colors, capacity, blanks }) => [colors, capacity, blanks]), [
    [4, 4, 2], [5, 4, 2], [6, 5, 2], [7, 5, 2], [8, 6, 2],
    [9, 6, 2], [10, 7, 2], [11, 7, 2], [12, 8, 2], [13, 8, 2],
    [14, 9, 2], [14, 9, 2], [14, 10, 2], [14, 10, 2], [14, 10, 2],
    [14, 10, 2], [14, 11, 2], [14, 11, 2], [14, 11, 2], [14, 12, 1],
  ]);
  assert.deepEqual(STAGES.map((stage) => stage.ruleKinds), [
    [], [], [], [], ["goal"], ["goal"], ["goal"], ["goal"],
    ["marked"], ["marked"], ["marked"], ["marked"],
    ["sealed"], ["sealed"], ["sealed"], ["sealed"],
    ["goal", "marked"], ["goal", "sealed"], ["marked", "sealed"],
    ["goal", "marked", "sealed"],
  ]);
  assert.deepEqual(STAGES.map((stage) => stage.hiddenDepth), [
    1, 2, 2, 3, 3, 4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6,
  ]);
  assert.deepEqual(STAGES.map((stage) => stage.name), [
    "첫걸음", "햇살길", "꽃들판", "솔숲길", "별빛뜰",
    "달맞이", "구름재", "바람고개", "수호숲", "수호문",
    "푸른마루", "별마루", "새벽뜰", "달그늘", "구름마당",
    "바람마루", "수호길", "별길", "마지막 고개", "열두 퍼즐",
  ]);
});

test("stage picker exposes all twenty stages as numbered ranges", async () => {
  const { stageGroups } = await import("./stage-config.js");
  assert.equal(typeof stageGroups, "function");
  assert.deepEqual(stageGroups(), [
    { start: 1, end: 4, label: "1~4단계" },
    { start: 5, end: 8, label: "5~8단계" },
    { start: 9, end: 12, label: "9~12단계" },
    { start: 13, end: 16, label: "13~16단계" },
    { start: 17, end: 20, label: "17~20단계" },
  ]);
});

test("stage twenty has one blank and all pets", () => {
  assert.deepEqual(PET_ORDER, [12, 13, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  const config = levelConfig("blind", 20);
  assert.equal(config.tier, 20);
  assert.equal(config.blanks, 1);
  assert.equal(stageColumns(config), 15);
  assert.deepEqual(config.petIds, PET_ORDER);
  assert.equal(config.steps, 1200);
  assert.equal(config.hidden, true);
  assert.equal(levelConfig("practice", 20).hidden, false);
  assert.equal(levelConfig("blind", 999).tier, 20);
});

test("time limits are the approved twenty values", () => {
  assert.deepEqual(STAGES.map((stage) => stage.timeLimitMs / 1000), [
    90, 110, 130, 150, 180, 210, 240, 270, 300, 330,
    360, 390, 420, 450, 480, 510, 540, 570, 600, 660,
  ]);
});
