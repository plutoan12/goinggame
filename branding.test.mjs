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
  assert.match(html, /style\.css\?v=mobile-4/);
  assert.match(html, /game\.js\?v=mobile-4/);
  assert.doesNotMatch(html, /\?v=mobile-[123]/);
  assert.match(game, /leaderboard\.js\?v=ranks-4/);
  assert.match(game, /leaderboard-view\.js\?v=ranks-4/);
  assert.match(view, /leaderboard\.js\?v=ranks-4/);
  assert.doesNotMatch(`${game}\n${view}`, /\?v=ranks-[123]/);
});
