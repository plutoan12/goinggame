import { readFile } from "node:fs/promises";
import { isWin } from "../engine.js";
import {
  LevelGenerationError,
  SEED_RETRIES,
  compactSolution,
  generateLevel,
  hiddenRatio,
  replaySolution,
} from "../level-generator.js";
import { validRuleProgress, validRules } from "../rules.js";
import { STAGES, levelConfig } from "../stage-config.js";
import { SAVE_KEY } from "../saved-game.js";
import { RANK_KEY, RANK_VERSION } from "../leaderboard.js";
import { releaseConfig as config } from "../release-config.js";
const root = new URL("../", import.meta.url);
const read = (file) => readFile(new URL(file, root), "utf8");
const capacitor = JSON.parse(await read("capacitor.config.json"));
const manifest = await read("android/app/src/main/AndroidManifest.xml");
const plist = await read("ios/App/App/Info.plist");
const policy = await read("privacy.html");
const page = await read("index.html");
const builtPage = await read("dist/index.html");
const builtGame = await read("dist/game.js");
const operatorDocs = (await Promise.all([
  read("README.md"),
  read("MOBILE.md"),
  read("IOS-VALIDATION.md"),
])).join("\n");
const androidStrings = await read("android/app/src/main/res/values/strings.xml");
const blockers = [];
const storeBlockers = [];
const gradle = await read("android/app/build.gradle");
const xcode = await read("ios/App/App.xcodeproj/project.pbxproj");
const namespace = gradle.match(/namespace\s*=\s*"([^"]+)"/)?.[1];
const androidId = gradle.match(/applicationId\s+"([^"]+)"/)?.[1];
const iosIds = [...xcode.matchAll(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/g)].map((match) => match[1]);
const expectedAppId = "com.onewaycompany.twelveguardians";
if (capacitor.appId !== expectedAppId || namespace !== expectedAppId || androidId !== expectedAppId || !iosIds.length || iosIds.some((id) => id !== expectedAppId)) blockers.push("웹·iOS·Android 앱 식별자를 com.onewaycompany.twelveguardians로 유지해야 함");
if (config.appName !== "열두 퍼즐" || capacitor.appName !== config.appName ||
    !plist.includes(`<string>${config.appName}</string>`) ||
    !androidStrings.includes(`>${config.appName}</string>`) ||
    !page.includes(`<h1>${config.appName}</h1>`)) {
  blockers.push("웹·iOS·Android 앱 이름을 열두 퍼즐로 통일해야 함");
}
if (STAGES.length !== 60) blockers.push("출시 단계 카탈로그는 정확히 60단계여야 함");
if (SAVE_KEY !== "twelve-puzzle-game-v4") blockers.push("현재 게임 저장 키는 twelve-puzzle-game-v4여야 함");
if (RANK_KEY !== "twelve-puzzle-rankings-v4" || RANK_VERSION !== "twelve-puzzle-rules-v4") blockers.push("현재 로컬 순위 키와 규칙 버전은 v4여야 함");
if (!builtPage.includes('id="holdingTray"') || !builtPage.includes("보관칸 +1")) blockers.push("빌드 결과에 보관칸과 보관칸 +1 아이템이 필요함");
if (/보조 칸/.test(`${builtPage}\n${builtGame}`) || /\\uBCF4\\uC870\s+\\uCE78/i.test(builtGame)) blockers.push("빌드 결과에 이전 보조 칸 문구가 남아 있음");
if (config.ads.enabled !== false) blockers.push("이번 릴리스의 광고는 비활성 상태여야 함");
if (config.publisher !== "원웨이컴퍼니" || config.supportEmail !== "qkdqor19@icloud.com") blockers.push("운영자와 지원 연락처를 승인된 값으로 유지해야 함");
if (!/60단계/.test(operatorDocs) || !operatorDocs.includes(SAVE_KEY) || !operatorDocs.includes(RANK_KEY) || !operatorDocs.includes("보관칸 +1")) blockers.push("운영 문서에 60단계·v4 저장/순위·보관칸 +1을 반영해야 함");
if (operatorDocs.includes("보조 칸")) blockers.push("운영 문서에 이전 보조 칸 문구가 남아 있음");
if (config.audience === "unset") storeBlockers.push("주 이용 연령 / 스토어 대상 연령 결정 필요");
if (!/^https:\/\/[^\s]+$/.test(config.privacyUrl)) storeBlockers.push("검토 완료된 개인정보처리방침의 공개 HTTPS URL 필요");
if (policy.includes("출시 전 검토 초안")) storeBlockers.push("개인정보처리방침 초안 검토·확정 필요");
if (page.includes("앱 준비 중") || page.includes("광고 배너 연결 위치")) blockers.push("출시 화면의 개발용 준비 문구·광고 자리 표시 정리 필요");
if (config.ads.enabled) {
  if (!config.ads.audienceReviewed || config.audience !== "general") blockers.push("광고 대상 연령 처리 미검토 (아동 대상 경로 미구현)");
  if (config.ads.testMode) blockers.push("출시 광고에 테스트 모드 사용 중");
  if (!/ca-app-pub-\d{16}\/\d{10}/.test(config.ads.androidRewardedId) || !/ca-app-pub-\d{16}\/\d{10}/.test(config.ads.iosRewardedId)) blockers.push("실제 플랫폼별 보상형 광고 단위 ID 필요");
  if ([manifest, plist, config.ads.androidRewardedId, config.ads.iosRewardedId].some((value) => value.includes("3940256099942544"))) blockers.push("공식 테스트 광고 ID를 운영자 AdMob ID로 교체해야 함");
}

function validGeneratedGeometry(level, stage) {
  if (level.state.capacity !== stage.capacity) return false;
  if (!Array.isArray(level.state.tubes) || !Array.isArray(level.state.hidden) || !Array.isArray(level.state.holding)) return false;
  if (level.state.tubes.length !== stage.colors + stage.blanks) return false;
  if (level.state.holding.length !== stage.holdingSlots || level.state.holding.some((entry) => entry !== null)) return false;
  if (level.state.hidden.length !== level.state.tubes.length) return false;
  const counts = Array(stage.colors).fill(0);
  for (let lane = 0; lane < level.state.tubes.length; lane++) {
    const tube = level.state.tubes[lane];
    const hidden = level.state.hidden[lane];
    if (tube.length > stage.capacity || hidden.length !== tube.length || hidden.some((flag) => typeof flag !== "boolean")) return false;
    if (hidden.at(-1) === true) return false;
    for (const pet of tube) {
      if (!Number.isInteger(pet) || pet < 0 || pet >= stage.colors) return false;
      counts[pet]++;
    }
  }
  return counts.every((count) => count === stage.capacity);
}

function stressGenerator() {
  const summaries = [];
  for (const mode of ["blind", "practice"]) {
    const started = performance.now();
    let boards = 0;
    let totalSteps = 0;
    let minSteps = Infinity;
    let maxSteps = 0;
    let minRatio = Infinity;
    let maxRatio = 0;
    let fallbackSeeds = 0;
    let maxRetryOffset = 0;
    let slowest = { durationMs: 0, round: 0, seed: 0 };
    for (let round = 1; round <= 60; round++) {
      for (let seed = 1; seed <= 20; seed++) {
        const caseStarted = performance.now();
        const stage = levelConfig(mode, round);
        let level;
        try {
          level = generateLevel(mode, seed, round);
        } catch (error) {
          const exhaustion = error instanceof LevelGenerationError
            ? ` (후보 ${error.candidatesPerSeed} × 시드 ${error.seedRetries})`
            : "";
          blockers.push(`생성기 재시도 고갈: ${mode}/${round}/${seed}${exhaustion}`);
          continue;
        }
        const durationMs = performance.now() - caseStarted;
        if (durationMs > slowest.durationMs) slowest = { durationMs, round, seed };
        const retryOffset = (level.seed - (seed >>> 0)) >>> 0;
        if (retryOffset > 0) fallbackSeeds++;
        if (retryOffset >= SEED_RETRIES) blockers.push(`생성기 시드 재시도 범위 초과: ${mode}/${round}/${seed}`);
        maxRetryOffset = Math.max(maxRetryOffset, retryOffset);
        if (!validGeneratedGeometry(level, stage)) blockers.push(`생성 보드 설정 범위 위반: ${mode}/${round}/${seed}`);
        if (!validRules(level.rules, stage) || !validRuleProgress(level.progress, level.rules)) blockers.push(`생성 보드 규칙 범위 위반: ${mode}/${round}/${seed}`);
        const ratio = hiddenRatio(level.state);
        if (mode === "blind" ? ratio < stage.minHiddenRatio : ratio !== 0) blockers.push(`생성 보드 숨김 비율 위반: ${mode}/${round}/${seed}`);
        const compact = compactSolution(level);
        if (compact.length !== level.solution.length || compact.length > stage.maxSolutionSteps) blockers.push(`생성 보드 압축 해답 길이 위반: ${mode}/${round}/${seed}`);
        try {
          if (!isWin(replaySolution(level).state)) blockers.push(`생성 보드 해답이 승리 상태가 아님: ${mode}/${round}/${seed}`);
        } catch (error) {
          blockers.push(`생성 보드 해답 재생 실패: ${mode}/${round}/${seed} (${error.message})`);
        }
        boards++;
        totalSteps += level.solution.length;
        minSteps = Math.min(minSteps, level.solution.length);
        maxSteps = Math.max(maxSteps, level.solution.length);
        minRatio = Math.min(minRatio, ratio);
        maxRatio = Math.max(maxRatio, ratio);
      }
    }
    summaries.push({
      mode,
      boards,
      durationMs: performance.now() - started,
      averageSteps: boards ? totalSteps / boards : 0,
      minSteps: Number.isFinite(minSteps) ? minSteps : 0,
      maxSteps,
      minRatio: Number.isFinite(minRatio) ? minRatio : 0,
      maxRatio,
      fallbackSeeds,
      maxRetryOffset,
      slowest,
    });
  }
  return summaries;
}

const stress = stressGenerator();
console.log(`앱: ${config.appName} / 운영자: ${config.publisher} / 광고: ${config.ads.enabled ? "켜짐" : "꺼짐"}`);
for (const summary of stress) {
  console.log(
    `STRESS ${summary.mode}: ${summary.boards}/1200 boards, ${summary.durationMs.toFixed(1)}ms, ` +
    `steps ${summary.minSteps}-${summary.maxSteps} (avg ${summary.averageSteps.toFixed(1)}), ` +
    `hidden ${(summary.minRatio * 100).toFixed(2)}%-${(summary.maxRatio * 100).toFixed(2)}%, ` +
    `fallback ${summary.fallbackSeeds} (max +${summary.maxRetryOffset}), ` +
    `slowest stage ${summary.slowest.round}/seed ${summary.slowest.seed} ${summary.slowest.durationMs.toFixed(1)}ms`,
  );
}
for (const blocker of blockers) console.log(`BLOCKED ${blocker}`);
for (const blocker of storeBlockers) console.log(`STORE-BLOCKED ${blocker}`);
console.log("이 점검은 정적 설정 검사입니다. 서명·기기 테스트·SDK 통신·스토어 심사 통과를 인증하지 않습니다.");
process.exitCode = blockers.length ? 1 : 0;
