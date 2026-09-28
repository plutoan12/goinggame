import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { isSingleColor, isWin } from "../engine.js";
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

export function generatedRuleContractIssues(level, stage) {
  const issues = [];
  const rules = level?.rules;
  const expectedKinds = [...(stage?.ruleKinds ?? [])].sort();
  const actualKinds = [];
  if (rules?.goalColor !== null && rules?.goalColor !== undefined) actualKinds.push("goal");
  if (Array.isArray(rules?.marked) && rules.marked.length > 0) actualKinds.push("marked");
  if (rules?.sealedLane !== null && rules?.sealedLane !== undefined) actualKinds.push("sealed");
  actualKinds.sort();
  if (JSON.stringify(actualKinds) !== JSON.stringify(expectedKinds)) {
    issues.push(`규칙 종류 불일치: expected=${expectedKinds.join(",") || "none"} actual=${actualKinds.join(",") || "none"}`);
  }
  if (!Array.isArray(rules?.marked) || rules.marked.length !== stage?.markedCount) {
    issues.push(`표식 개수 불일치: expected=${stage?.markedCount} actual=${rules?.marked?.length ?? "invalid"}`);
  }
  return issues;
}

export function inspectHiddenContract(state, stage) {
  const issues = [];
  if (!Number.isInteger(stage?.hiddenDepth) || stage.hiddenDepth < 0 ||
      !Number.isInteger(stage?.capacity) || stage.capacity < 1 || stage.hiddenDepth >= stage.capacity) {
    issues.push(`hiddenDepth 설정 범위 위반: depth=${stage?.hiddenDepth} capacity=${stage?.capacity}`);
  }
  if (!Array.isArray(state?.tubes) || !Array.isArray(state?.hidden)) {
    return { issues: ["숨김 상태 배열 누락"], hiddenTiles: 0, totalTiles: 0, ratio: 0, upperBound: 0 };
  }
  const totalTiles = state.tubes.reduce((sum, tube) => sum + (Array.isArray(tube) ? tube.length : 0), 0);
  let hiddenTiles = 0;
  let upperTiles = 0;
  if (state.hidden.length !== state.tubes.length) issues.push("숨김 열 개수 불일치");
  for (let lane = 0; lane < state.tubes.length; lane++) {
    const tube = state.tubes[lane];
    const flags = state.hidden[lane];
    if (!Array.isArray(tube) || !Array.isArray(flags) || flags.length !== tube.length) {
      issues.push(`숨김 열 형태 불일치: lane=${lane}`);
      continue;
    }
    const expectedDepth = stage?.hidden && !isSingleColor(tube)
      ? Math.min(stage.hiddenDepth, Math.max(0, tube.length - 1))
      : 0;
    upperTiles += expectedDepth;
    for (let index = 0; index < flags.length; index++) {
      if (typeof flags[index] !== "boolean") {
        issues.push(`숨김 플래그 형식 불일치: lane=${lane} index=${index}`);
        continue;
      }
      if (flags[index]) hiddenTiles++;
      if (flags[index] !== (index < expectedDepth)) {
        issues.push(`hiddenDepth 패턴 불일치: lane=${lane} index=${index}`);
      }
    }
  }
  const ratio = totalTiles === 0 ? 0 : hiddenTiles / totalTiles;
  const upperBound = totalTiles === 0 ? 0 : upperTiles / totalTiles;
  if (ratio > upperBound + Number.EPSILON) {
    issues.push(`숨김 비율 상한 초과: ratio=${ratio} upper=${upperBound}`);
  }
  return { issues, hiddenTiles, totalTiles, ratio, upperBound };
}

export function operatorDocumentIssues(file, text) {
  const issues = [];
  if (!/60단계/.test(text)) issues.push("60단계 설명 누락");
  if (!text.includes("보관칸 +1")) issues.push("보관칸 +1 설명 누락");
  if (!text.includes(SAVE_KEY) || !text.includes(RANK_KEY)) issues.push("v4 저장·순위 키 누락");
  if (!/광고.{0,20}(비활성|꺼진|enabled=false)|enabled=false.{0,20}광고/s.test(text)) issues.push("광고 비활성 설명 누락");
  if (/현재\s+20단계|전체\s+20단계|다섯\s+장,?\s*20단계|20단계(?:의|가)\s*(?:길어지는|순서대로)/.test(text)) {
    issues.push("현재 릴리스를 20단계로 설명하는 문구 존재");
  }
  if (/보조 칸/.test(text)) issues.push("이전 보조 칸 문구 존재");
  return issues.map((issue) => `${file}: ${issue}`);
}

async function main() {
const root = new URL("../", import.meta.url);
const read = (file) => readFile(new URL(file, root), "utf8");
const capacitor = JSON.parse(await read("capacitor.config.json"));
const manifest = await read("android/app/src/main/AndroidManifest.xml");
const plist = await read("ios/App/App/Info.plist");
const policy = await read("privacy.html");
const page = await read("index.html");
const builtPage = await read("dist/index.html");
const builtGame = await read("dist/game.js");
const operatorDocFiles = ["README.md", "MOBILE.md", "IOS-VALIDATION.md", "RELEASE.md", "TESTFLIGHT.md"];
const operatorDocs = await Promise.all(operatorDocFiles.map(async (file) => ({ file, text: await read(file) })));
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
for (const { file, text } of operatorDocs) blockers.push(...operatorDocumentIssues(file, text));
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
    let minUpperBound = Infinity;
    let maxUpperBound = 0;
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
        for (const issue of generatedRuleContractIssues(level, stage)) {
          blockers.push(`생성 보드 규칙 계약 위반: ${mode}/${round}/${seed} (${issue})`);
        }
        const hiddenInspection = inspectHiddenContract(level.state, stage);
        for (const issue of hiddenInspection.issues) {
          blockers.push(`생성 보드 숨김 계약 위반: ${mode}/${round}/${seed} (${issue})`);
        }
        const ratio = hiddenInspection.ratio;
        if (ratio !== hiddenRatio(level.state)) blockers.push(`생성 보드 숨김 비율 계산 불일치: ${mode}/${round}/${seed}`);
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
        minUpperBound = Math.min(minUpperBound, hiddenInspection.upperBound);
        maxUpperBound = Math.max(maxUpperBound, hiddenInspection.upperBound);
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
      minUpperBound: Number.isFinite(minUpperBound) ? minUpperBound : 0,
      maxUpperBound,
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
    `depth-bound ${(summary.minUpperBound * 100).toFixed(2)}%-${(summary.maxUpperBound * 100).toFixed(2)}%, ` +
    `fallback ${summary.fallbackSeeds} (max +${summary.maxRetryOffset}), ` +
    `slowest stage ${summary.slowest.round}/seed ${summary.slowest.seed} ${summary.slowest.durationMs.toFixed(1)}ms`,
  );
}
for (const blocker of blockers) console.log(`BLOCKED ${blocker}`);
for (const blocker of storeBlockers) console.log(`STORE-BLOCKED ${blocker}`);
console.log("이 점검은 정적 설정 검사입니다. 서명·기기 테스트·SDK 통신·스토어 심사 통과를 인증하지 않습니다.");
process.exitCode = blockers.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
