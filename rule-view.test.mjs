import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

test("the controller consumes location rules and emits location targets", async () => {
  const game = await readFile("game.js", "utf8");
  assert.match(game, /canRuleTransfer/);
  assert.match(game, /applyRuleTransfer/);
  assert.match(game, /legalRuleTransfers/);
  assert.match(game, /data(?:set)?\.locationKind|data-location-kind/);
  assert.match(game, /data(?:set)?\.locationIndex|data-location-index/);
  assert.doesNotMatch(game, /\b(?:canRuleMove|applyRuleMove|legalRuleMoves)\b/);
});

test("holding tray is outside the board viewport but inside the drag surface", async () => {
  const html = await readFile("index.html", "utf8");
  const surfaceStart = html.indexOf('id="playSurface"');
  const tray = html.indexOf('id="holdingTray"');
  const viewport = html.indexOf('id="boardViewport"');
  const surfaceEnd = html.indexOf("</section>", surfaceStart);
  assert.ok(surfaceStart >= 0);
  assert.ok(tray > surfaceStart && tray < viewport);
  assert.ok(viewport < surfaceEnd);
  assert.match(html, /id="holdingCount"[^>]*aria-live="polite"/);
});
