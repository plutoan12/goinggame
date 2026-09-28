import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { releaseConfig } from "./release-config.js";

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

test("current product docs describe the twenty-stage pixel game and local rank", async () => {
  const paths = ["README.md", "MOBILE.md", "RELEASE.md", "TESTFLIGHT.md"];
  const docs = (await Promise.all(paths.map(read))).join("\n");
  assert.match(docs, /20단계/);
  assert.match(docs, /픽셀/);
  assert.match(docs, /기기 (안|내).*순위|기기.*로컬 순위/);
  assert.doesNotMatch(docs, /선택형 광고 위치|광고 배너 연결 위치|광고를 보면|광고 시청 보상/);
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
  assert.match(html, /game\.js\?v=mobile-5/);
  assert.doesNotMatch(html, /\?v=mobile-[1234]/);
  assert.match(game, /stage-config\.js\?v=stages-2/);
  assert.match(game, /engine\.js\?v=engine-2/);
  assert.match(game, /level-generator\.js\?v=generator-2/);
  assert.match(game, /session\.js\?v=limits-2/);
  assert.match(game, /saved-game\.js\?v=save-4/);
  assert.match(game, /leaderboard\.js\?v=ranks-5/);
  assert.match(game, /leaderboard-view\.js\?v=ranks-5/);
  assert.match(view, /leaderboard\.js\?v=ranks-5/);
  assert.match(leaderboard, /saved-game\.js\?v=save-4/);
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
