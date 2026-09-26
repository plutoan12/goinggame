import test from "node:test";
import assert from "node:assert/strict";
import { laneRuleView, ruleSummary } from "./rule-view.js";

const pets = ["고양이", "병아리", "토끼", "강아지"];
const combined = {
  goalColor: 0,
  marked: [{ lane: 2, color: 1 }],
  sealedLane: 3,
  unlockColor: 0,
};

test("goal summaries distinguish pending and completed states", () => {
  assert.match(ruleSummary(combined, { goalAchieved: false, sealOpened: false }, pets), /수호 목표.*고양이.*먼저/);
  assert.match(ruleSummary(combined, { goalAchieved: true, sealOpened: true }, pets), /수호 목표.*완료/);
});

test("combined rule labels describe icons and state without color alone", () => {
  const pending = { goalAchieved: false, sealOpened: false };
  const summary = ruleSummary(combined, pending, pets);
  assert.match(summary, /표식 열/);
  assert.match(summary, /봉인/);
  assert.match(laneRuleView(3, combined, pending, pets).label, /잠김/);
  assert.equal(laneRuleView(3, combined, pending, pets).locked, true);
  assert.match(laneRuleView(2, combined, pending, pets).label, /병아리 전용/);
  assert.equal(laneRuleView(2, combined, pending, pets).markedColor, 1);
});

test("unlocked seals and ordinary lanes remain explicitly labeled", () => {
  const open = { goalAchieved: true, sealOpened: true };
  assert.match(laneRuleView(3, combined, open, pets).label, /봉인 해제/);
  assert.deepEqual(laneRuleView(1, combined, open, pets), {
    classes: [],
    label: "일반 열",
    locked: false,
    markedColor: null,
  });
});
