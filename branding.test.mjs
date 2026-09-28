import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { releaseConfig } from "./release-config.js";
import {
  generatedRuleContractIssues,
  inspectHiddenContract,
  operatorDocumentIssues,
} from "./scripts/release-check.mjs";
import * as releaseCheck from "./scripts/release-check.mjs";

const read = (path) => readFile(path, "utf8");

test("all shipped surfaces use the Twelve Puzzle brand", async () => {
  const capacitor = JSON.parse(await read("capacitor.config.json"));
  const [html, game, plist, android, policy] = await Promise.all([
    read("index.html"),
    read("game.js"),
    read("ios/App/App/Info.plist"),
    read("android/app/src/main/res/values/strings.xml"),
    read("privacy.html"),
  ]);
  assert.equal(releaseConfig.appName, "열두 퍼즐");
  assert.equal(capacitor.appName, "열두 퍼즐");
  assert.equal(capacitor.appId, "com.onewaycompany.twelveguardians");
  assert.match(html, /<h1>열두 퍼즐<\/h1>/);
  assert.doesNotMatch(game, /열두 수호대/);
  assert.match(plist, /<key>CFBundleDisplayName<\/key>\s*<string>열두 퍼즐<\/string>/);
  assert.match(android, /<string name="app_name">열두 퍼즐<\/string>/);
  assert.match(android, /<string name="title_activity_main">열두 퍼즐<\/string>/);
  assert.match(policy, /열두 퍼즐 개인정보처리방침/);
});

test("every operator document describes the sixty-stage v4 holding release", async () => {
  const paths = ["README.md", "MOBILE.md", "IOS-VALIDATION.md", "RELEASE.md", "TESTFLIGHT.md"];
  for (const path of paths) {
    const doc = await read(path);
    assert.match(doc, /60단계/, `${path}: stage count`);
    assert.match(doc, /보관칸 \+1/, `${path}: holding-plus item`);
    assert.match(doc, /twelve-puzzle-game-v4/, `${path}: active save key`);
    assert.match(doc, /twelve-puzzle-rankings-v4/, `${path}: local rank key`);
    assert.match(doc, /광고.{0,20}(비활성|꺼진|enabled=false)|enabled=false.{0,20}광고/s, `${path}: ads disabled`);
    assert.doesNotMatch(
      doc,
      /현재\s+20단계|전체\s+20단계|다섯\s+장,?\s*20단계|20단계(?:의|가)\s*(?:길어지는|순서대로)|보조 칸/,
      `${path}: stale release copy`,
    );
  }
  for (const path of ["RELEASE.md", "TESTFLIGHT.md"]) {
    assert.match(await read(path), /자유 보관칸/, `${path}: free holding`);
  }
});

test("publisher, support email and bundle identifier stay unchanged", async () => {
  const [gradle, project] = await Promise.all([
    read("android/app/build.gradle"),
    read("ios/App/App.xcodeproj/project.pbxproj"),
  ]);
  assert.equal(releaseConfig.publisher, "원웨이컴퍼니");
  assert.equal(releaseConfig.supportEmail, "qkdqor19@icloud.com");
  assert.match(gradle, /applicationId "com\.onewaycompany\.twelveguardians"/);
  assert.match(project, /PRODUCT_BUNDLE_IDENTIFIER = com\.onewaycompany\.twelveguardians;/);
});

test("web entry points bump their cache version with native reliability fixes", async () => {
  const html = await read("index.html");
  const game = await read("game.js");
  const view = await read("leaderboard-view.js");
  const leaderboard = await read("leaderboard.js");
  const engine = await read("engine.js");
  const generator = await read("level-generator.js");
  const session = await read("session.js");
  const saved = await read("saved-game.js");
  assert.match(html, /style\.css\?v=mobile-5/);
  assert.match(html, /game\.js\?v=mobile-6/);
  assert.doesNotMatch(html, /\?v=mobile-[1234]/);
  assert.match(game, /stage-config\.js\?v=stages-2/);
  assert.match(game, /engine\.js\?v=engine-2/);
  assert.match(game, /level-generator\.js\?v=generator-3/);
  assert.match(game, /session\.js\?v=limits-3/);
  assert.match(game, /saved-game\.js\?v=save-5/);
  assert.match(game, /leaderboard\.js\?v=ranks-5/);
  assert.match(game, /leaderboard-view\.js\?v=ranks-5/);
  assert.match(view, /leaderboard\.js\?v=ranks-5/);
  assert.match(leaderboard, /saved-game\.js\?v=save-5/);
  for (const source of [engine, generator, session, saved]) {
    assert.match(source, /stage-config\.js\?v=stages-2/);
  }
  assert.doesNotMatch(`${game}\n${view}`, /\?v=ranks-[1234]/);
});

test("stage selector clearly presents sixty stages in groups of ten", async () => {
  const html = await read("index.html");
  const game = await read("game.js");
  assert.match(html, /전체 60단계/);
  assert.match(html, /10단계씩 펼쳐 보기/);
  assert.doesNotMatch(game, /\$\{chapter \+ 1\}장/);
});

test("the shipped game names the holding item and removes the old auxiliary-lane copy", async () => {
  const [html, game] = await Promise.all([read("index.html"), read("game.js")]);
  assert.match(html, /보관칸 \+1/);
  assert.match(`${html}\n${game}`, /보관칸 없음/);
  assert.doesNotMatch(`${html}\n${game}`, /보조 칸/);
  assert.match(game, /holding-plus/);
  assert.match(game, /addHoldingSlot/);
});

test("release validation rejects missing, extra and miscounted generated rules", () => {
  const stage = {
    ruleKinds: ["goal", "marked", "sealed"],
    markedCount: 2,
  };
  const valid = {
    rules: {
      goalColor: 1,
      marked: [{ lane: 2, color: 3 }, { lane: 4, color: 5 }],
      sealedLane: 6,
      unlockColor: 1,
    },
  };
  assert.deepEqual(generatedRuleContractIssues(valid, stage), []);
  assert.ok(generatedRuleContractIssues({ ...valid, rules: { ...valid.rules, goalColor: null } }, stage).length);
  assert.ok(generatedRuleContractIssues({ ...valid, rules: { ...valid.rules, marked: [] } }, stage).length);
  assert.ok(generatedRuleContractIssues({ ...valid, rules: { ...valid.rules, sealedLane: null } }, stage).length);
  assert.ok(generatedRuleContractIssues(valid, { ruleKinds: ["goal", "sealed"], markedCount: 0 }).length);
  assert.ok(generatedRuleContractIssues(valid, { ...stage, markedCount: 1 }).length);
});

test("release validation enforces hidden-depth patterns and their upper bound", () => {
  const blindStage = { hidden: true, hiddenDepth: 2, capacity: 4 };
  const valid = {
    tubes: [[0, 1, 2, 3], [3, 2], [1, 1, 1], []],
    hidden: [[true, true, false, false], [true, false], [false, false, false], []],
  };
  const inspected = inspectHiddenContract(valid, blindStage);
  assert.deepEqual(inspected.issues, []);
  assert.equal(inspected.hiddenTiles, 3);
  assert.equal(inspected.totalTiles, 9);
  assert.equal(inspected.upperBound, 1 / 3);

  const missingDepth = structuredClone(valid);
  missingDepth.hidden[0][1] = false;
  assert.ok(inspectHiddenContract(missingDepth, blindStage).issues.length);

  const beyondDepth = structuredClone(valid);
  beyondDepth.hidden[0][2] = true;
  assert.ok(inspectHiddenContract(beyondDepth, blindStage).issues.length);

  const hiddenUniform = structuredClone(valid);
  hiddenUniform.hidden[2][0] = true;
  assert.ok(inspectHiddenContract(hiddenUniform, blindStage).issues.length);

  const practice = structuredClone(valid);
  practice.hidden = practice.tubes.map((tube) => tube.map(() => false));
  assert.deepEqual(inspectHiddenContract(practice, { hidden: false, hiddenDepth: 2, capacity: 4 }).issues, []);
  practice.hidden[0][0] = true;
  assert.ok(inspectHiddenContract(practice, { hidden: false, hiddenDepth: 2, capacity: 4 }).issues.length);

  const topSaturating = structuredClone(valid);
  topSaturating.hidden[0] = [true, true, true, false];
  assert.ok(inspectHiddenContract(topSaturating, { hidden: true, hiddenDepth: 4, capacity: 4 }).issues.length);
});

test("release milestone contract rejects every fabricated difficulty metric", () => {
  assert.equal(typeof releaseCheck.milestoneReleaseContractIssues, "function");
  if (typeof releaseCheck.milestoneReleaseContractIssues !== "function") return;
  const stage = {
    tier: 10,
    hidden: true,
    minHiddenRatio: 0.10,
    maxSolutionSteps: 80,
  };
  const valid = {
    solutionSteps: 24,
    mixingScore: 16,
    initialLegalMoves: 8,
    earlyLegalMoveFloor: 7,
    blankTubeMoves: 6,
    hiddenRatio: 0.10,
  };
  assert.deepEqual(releaseCheck.milestoneReleaseContractIssues(valid, stage), []);
  for (const [field, value] of [
    ["solutionSteps", 23],
    ["mixingScore", 15],
    ["initialLegalMoves", 1],
    ["earlyLegalMoveFloor", 1],
    ["blankTubeMoves", 5],
    ["hiddenRatio", 0.09],
  ]) {
    assert.ok(
      releaseCheck.milestoneReleaseContractIssues({ ...valid, [field]: value }, stage).length,
      field,
    );
  }
  assert.ok(
    releaseCheck.milestoneReleaseContractIssues({ ...valid, solutionSteps: 81 }, stage).length,
    "maximum solution length",
  );
});

test("release document validation rejects contradictions in an individual document", () => {
  const valid = [
    "현재 60단계 빌드",
    "자유 보관칸과 보관칸 +1",
    "twelve-puzzle-game-v4",
    "twelve-puzzle-rankings-v4",
    "광고 enabled=false 비활성",
  ].join("\n");
  assert.deepEqual(operatorDocumentIssues("fixture.md", valid), []);
  assert.ok(operatorDocumentIssues("fixture.md", `${valid}\n현재 20단계 빌드`).length);
  assert.ok(operatorDocumentIssues("fixture.md", valid.replace("보관칸 +1", "보조 칸")).length);
  assert.ok(operatorDocumentIssues("fixture.md", valid.replace("twelve-puzzle-game-v4", "twelve-puzzle-game-v3")).length);
});
