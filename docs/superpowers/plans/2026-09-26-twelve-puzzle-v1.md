# 열두 퍼즐 1차 완성 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 5단계 정렬 퍼즐을 검증 가능한 특수 규칙을 갖춘 20단계 오프라인 모바일 게임 `열두 퍼즐`로 완성한다.

**Architecture:** 기본 이동 엔진, 단계 설정, 특수 규칙, 보드 생성기를 순수 모듈로 분리하고 UI는 이 모듈의 판정 결과만 렌더링한다. 새 저장 스키마와 로컬 순위는 20단계 및 규칙 진행 상태를 검증하며, 픽셀 에셋과 자체 호스팅 글꼴은 정적 빌드에 포함한다.

**Tech Stack:** JavaScript ES modules, Node.js 22 test runner, HTML/CSS, esbuild, Sharp, Capacitor 8, iOS/Xcode, Galmuri 2.40.3.

**Spec:** `docs/superpowers/specs/2026-09-26-twelve-puzzle-v1-design.md`

## Global Constraints

- 사용자 노출 이름은 `열두 퍼즐`, 번들 ID는 `com.onewaycompany.twelveguardians`를 유지한다.
- 단계는 정확히 20개이며 1~19단계는 빈 열 2개, 20단계는 빈 열 1개다.
- 보드 최대 크기는 16열 × 12칸이고 11단계부터 14종 전체를 사용한다.
- 수호 목표, 표식 열, 봉인 열은 시작부터 공개하며 규칙을 포함한 정답 경로를 재생 검증한다.
- 실제 광고, 온라인 순위, 로그인, 결제와 스토어 제출은 범위 밖이다.
- 이전 `twelve-guardians-*` 저장 키는 삭제하거나 변환하지 않고 새 게임에서 읽지 않는다.
- 모든 새 동작은 실패하는 테스트를 먼저 확인한 뒤 최소 구현으로 통과시킨다.
- 픽셀 글꼴과 이미지가 실패해도 텍스트와 접근성 라벨로 게임을 진행할 수 있어야 한다.

## Review Focus

- 목표 달성 이동 한 번에 수호 목표와 봉인이 동시에 바뀌어도 같은 이동이 이중 차감되거나 다시 잠기지 않아야 한다. Task 2의 조합 규칙 테스트로 고정한다.
- 20단계의 빈 열 1개와 보조 칸을 함께 저장·되돌릴 때 열 개수와 규칙 진행 상태가 손상되지 않아야 한다. Task 4의 스냅샷 테스트로 고정한다.
- UI의 드래그 가능 표시, 실제 드롭 판정과 생성기 정답 재생이 모두 같은 `canRuleMove`를 사용해야 한다. Task 5의 소스/통합 테스트로 고정한다.
- 손상된 규칙 저장, 범위를 벗어난 단계와 이전 키는 새 진행이나 순위를 해제하지 않아야 한다. Task 4의 검증 테스트로 고정한다.
- 오프라인 네이티브 번들에 글꼴·아틀라스·라이선스가 모두 포함되고 광고 버튼은 보이지 않아야 한다. Task 6~8의 빌드 산출물 검사로 고정한다.

---

## File Map

- `stage-config.js`: 20단계의 이름, 크기, 동물, 숨김, 빈 열, 규칙 종류, 타임어택 값.
- `engine.js`: 규칙을 모르는 기본 보드 연산만 유지.
- `rules.js`: 수호 목표, 표식 열, 봉인 열의 이동 판정과 진행 상태.
- `level-generator.js`: 역이동 생성, 규칙 배정, 후보 선택, 정답 경로 검증.
- `session.js`: 규칙 경로 기반 이동 한도, 타이머, 아이템, 게임 결과.
- `saved-game.js`, `progression.js`, `leaderboard.js`, `tutorial.js`: 새 `twelve-puzzle-*` 저장 스키마.
- `rule-view.js`: 특수 규칙 설명과 열별 표시 모델 생성.
- `game-state.js`: 이동 이력 스냅샷과 규칙 진행 상태의 복원.
- `game.js`: 입력·세션·저장·모달을 조정하되 합법성은 엔진 모듈에 위임.
- `style.css`, `index.html`: 전체 픽셀 UI와 20단계 선택 화면.
- `assets/pixel-guardian-atlas.png`: 14종 동물 4×4 픽셀 아틀라스.
- `assets/pixel-special-atlas.png`: 물음표, 목표, 표식, 봉인과 반짝임 픽셀 아틀라스.
- `assets/pixel-app-icon-source.png`: 앱 아이콘 원본.
- `assets/fonts/`: Galmuri11 Regular/Bold WOFF2와 OFL 라이선스.
- `scripts/prepare-fonts.mjs`, `scripts/build.mjs`, `scripts/icons.mjs`: 폰트·에셋 복사와 네이티브 아이콘 생성.
- `ios/`, `android/`, `capacitor.config.json`: 표시 이름만 `열두 퍼즐`로 변경.

### Task 1: 20단계 카탈로그와 순차 해제

**Files:**
- Create: `stage-config.js`
- Create: `stage-config.test.mjs`
- Modify: `engine.js`
- Modify: `progression.js`
- Modify: `progression.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `STAGES`, `PET_ORDER`, `levelConfig(mode, round)`, `stageColumns(config)` from `stage-config.js`.
- `levelConfig` returns `{ tier, name, colors, capacity, hiddenDepth, blanks, steps, hidden, petIds, ruleKinds, timeLimitMs }`.
- `engine.js` re-exports `STAGES` and `levelConfig` temporarily so existing consumers keep working until Task 5.

- [ ] **Step 1: Write failing stage catalog tests**

Add tests named `twenty stages match the approved size and rule table`, `stage twenty has one blank and all pets`, and `time limits are the approved twenty values`. Assert all values from spec section 5 and the exact seconds list from section 7.

```js
test("twenty stages match the approved size and rule table", () => {
  assert.equal(STAGES.length, 20);
  assert.deepEqual(STAGES.map(({ colors, capacity, blanks }) => [colors, capacity, blanks]), [
    [4,4,2],[5,4,2],[6,5,2],[7,5,2],[8,6,2],
    [9,6,2],[10,7,2],[11,7,2],[12,8,2],[13,8,2],
    [14,9,2],[14,9,2],[14,10,2],[14,10,2],[14,10,2],
    [14,10,2],[14,11,2],[14,11,2],[14,11,2],[14,12,1],
  ]);
  assert.deepEqual(STAGES.map((s) => s.ruleKinds), [
    [],[],[],[],["goal"],["goal"],["goal"],["goal"],
    ["marked"],["marked"],["marked"],["marked"],
    ["sealed"],["sealed"],["sealed"],["sealed"],
    ["goal","marked"],["goal","sealed"],["marked","sealed"],
    ["goal","marked","sealed"],
  ]);
});
```

- [ ] **Step 2: Extend the progression test to 20 stages**

Change the successful unlock loop to `1..20`; assert `levelConfig` safely displays stage 20 for an oversized round while progression refuses to access or complete stage 21, and corrupt `cleared: 21` stays locked.

- [ ] **Step 3: Run tests and verify RED**

Run: `node --test stage-config.test.mjs progression.test.mjs`

Expected: FAIL because `stage-config.js` does not exist and progression still caps at five.

- [ ] **Step 4: Implement the stage catalog and dynamic progression cap**

Use the approved 20-row table. Set `steps` to `Math.min(1200, 180 + tier * 60)`, use `[12,13,0,1,2,3,4,5,6,7,8,9,10,11]` as `PET_ORDER`, and derive progression limits from `STAGES.length`.

- [ ] **Step 5: Run focused and full tests**

Run: `node --test stage-config.test.mjs progression.test.mjs && npm test`

Expected: PASS with no warnings.

- [ ] **Step 6: Commit**

```bash
git add stage-config.js stage-config.test.mjs engine.js progression.js progression.test.mjs package.json
git commit -m "feat: add twenty-stage progression"
```

### Task 2: 순수 특수 규칙 엔진

**Files:**
- Create: `rules.js`
- Create: `rules.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `canPour`, `applyMove`, `revealCompleted`, `isTubeDone` from `engine.js`.
- Produces:
  - `initialRuleProgress(rules) -> { goalAchieved, sealOpened }`
  - `canRuleMove(state, from, to, rules, progress) -> { allowed, reason }`
  - `applyRuleMove(state, from, to, rules, progress) -> null | { state, progress, completedColor }`
  - `legalRuleMoves(state, rules, progress) -> Array<{from,to,count:1}>`
  - `validRules(rules, config)` and `validRuleProgress(progress, rules)`.
- Rule shape: `{ goalColor: number|null, marked: Array<{lane:number,color:number}>, sealedLane: number|null, unlockColor: number|null }`.

- [ ] **Step 1: Write failing base and goal tests**

Test that an ordinary mixed-color move remains allowed, a non-goal completion move is rejected before `goalColor` completes, the goal move sets `goalAchieved`, and later completion is allowed.

```js
test("goal must be the first completed color", () => {
  const rules = { goalColor: 0, marked: [], sealedLane: null, unlockColor: null };
  const progress = initialRuleProgress(rules);
  assert.equal(canRuleMove(stateBeforeOtherCompletion, 0, 1, rules, progress).allowed, false);
  const goal = applyRuleMove(stateBeforeGoalCompletion, 0, 1, rules, progress);
  assert.equal(goal.progress.goalAchieved, true);
  assert.equal(canRuleMove(goal.state, 2, 3, rules, goal.progress).allowed, true);
});
```

- [ ] **Step 2: Write failing marked and sealed tests**

Test that marked lanes accept only their color while allowing existing wrong colors to leave; sealed lanes reject both source and destination moves until `unlockColor` completes.

```js
test("marked and sealed lanes constrain both input directions exactly", () => {
  assert.equal(canRuleMove(markedState, 0, 2, markedRules, markedProgress).allowed, false);
  assert.equal(canRuleMove(markedState, 1, 2, markedRules, markedProgress).allowed, true);
  assert.equal(canRuleMove(sealedState, 3, 0, sealedRules, sealedProgress).allowed, false);
  assert.equal(canRuleMove(sealedState, 0, 3, sealedRules, sealedProgress).allowed, false);
});
```

- [ ] **Step 3: Add the Review Focus combination test**

Use one move that completes `goalColor === unlockColor`; assert it increments the board once, sets both booleans once, and a later move cannot re-lock the lane.

- [ ] **Step 4: Run tests and verify RED**

Run: `node --test rules.test.mjs`

Expected: FAIL because the exported rule functions do not exist.

- [ ] **Step 5: Implement the minimal pure rule engine**

`canRuleMove` must call `canPour` first, then enforce seal, mark, and goal-completion constraints in that order. `applyRuleMove` must use `canRuleMove`, perform exactly one base move, reveal completed lanes, and return cloned progress.

- [ ] **Step 6: Run focused and full tests**

Run: `node --test rules.test.mjs && npm test`

Expected: PASS with no warnings.

- [ ] **Step 7: Commit**

```bash
git add rules.js rules.test.mjs package.json
git commit -m "feat: add deterministic special rules"
```

### Task 3: 규칙 인식 보드 생성기와 2,000개 해법 검증

**Files:**
- Create: `level-generator.js`
- Create: `level-generator.test.mjs`
- Modify: `engine.js`
- Modify: `engine.test.mjs`
- Modify: `session.js`
- Modify: `session.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: stage config from Task 1 and rule moves from Task 2.
- Produces:
  - `generateLevel(mode, requestedSeed, round) -> { state, solution, rules, progress, seed }`
  - `compactSolution(level) -> Array<{from,to,count:1}>`
  - `replaySolution(level) -> { state, progress }`
  - `LevelGenerationError` carrying `mode`, `round`, and `requestedSeed`.
- `session.createRun(level, rule, stage)` consumes the rule-aware compact solution.

- [ ] **Step 1: Move generator expectations into a failing module test**

Assert deterministic output for equal mode/seed/stage, different output for different seeds, valid pet counts, 40-candidate/16-seed fallback metadata, and a returned resolved `seed`.

- [ ] **Step 2: Add failing special-rule assignment tests**

For stages 5, 9, 13, 17, 18, 19, and 20, assert exact rule kinds, in-range colors/lanes, same target/unlock color when combined, and rule-aware replay ending in `isWin(state)`.

- [ ] **Step 3: Add the 2,000-board test**

For both modes, every stage, and seeds 1 through 50, generate a level and replay every solution move using `applyRuleMove`; assert each move is allowed and the final board wins.

```js
test("2000 boards solve through the same rule engine used by players", () => {
  for (const mode of ["blind", "practice"])
    for (let round = 1; round <= 20; round++)
      for (let seed = 1; seed <= 50; seed++) {
        const level = generateLevel(mode, seed, round);
        const replayed = replaySolution(level);
        assert.equal(isWin(replayed.state), true, `${mode}/${round}/${seed}`);
      }
});
```

- [ ] **Step 4: Add failing limit assertions**

For all generated levels, assert `createRun(...).limit === Math.max(24, Math.ceil(compactSolution(level).length * 1.25) + 8)` and the known solution fits the limit.

- [ ] **Step 5: Run tests and verify RED**

Run: `node --test level-generator.test.mjs session.test.mjs`

Expected: FAIL because `level-generator.js` and rule-aware limit behavior are missing.

- [ ] **Step 6: Extract generation from `engine.js` and implement rule assignment**

For each base witness, simulate completion order and lane traffic. Choose the first completed color for `goalColor`, final-home lanes whose incoming witness moves all match for `marked`, and a lane untouched before unlock for `sealedLane`. Reject incompatible candidates; after 40 candidates advance the seed, up to 16 seeds.

- [ ] **Step 7: Replay before returning every candidate**

Return only when every witness move passes `applyRuleMove` and the final state wins; otherwise continue. Throw `LevelGenerationError` after the final attempt.

- [ ] **Step 8: Run focused tests, then the full suite twice**

Run: `node --test level-generator.test.mjs session.test.mjs`

Run: `npm test && npm test`

Expected: both full runs PASS, demonstrating deterministic generation without flaky candidates.

- [ ] **Step 9: Commit**

```bash
git add level-generator.js level-generator.test.mjs engine.js engine.test.mjs session.js session.test.mjs package.json
git commit -m "feat: generate solvable rule-aware boards"
```

### Task 4: 새 저장·진행·순위 스키마

**Files:**
- Modify: `saved-game.js`
- Modify: `saved-game.test.mjs`
- Modify: `progression.js`
- Modify: `progression.test.mjs`
- Modify: `leaderboard.js`
- Modify: `leaderboard.test.mjs`
- Modify: `tutorial.js`
- Modify: `tutorial.test.mjs`

**Interfaces:**
- Produces `SAVE_KEY = "twelve-puzzle-game-v1"`, `PROGRESS_KEY = "twelve-puzzle-progress-v1"`, `RANK_KEY = "twelve-puzzle-rankings-v1"`, and `TUTORIAL_KEY = "twelve-puzzle-tutorial-v1"`.
- `validSavedGame(saved) -> boolean` validates board, resolved seed, 1..20 stage, rule config/progress, history snapshots, run and added lane count.
- History snapshot shape becomes `{ state, moves, extra, ruleProgress }`.
- Ranking records add `rulesVersion: "twelve-puzzle-rules-v1"` and allow stages 1..20.

- [ ] **Step 1: Replace migration tests with failing fresh-schema tests**

Assert valid stage-20 saves pass; invalid lane indexes, colors, `goalAchieved`, seal state, history shape, stage 21, or old schema fail. Assert old storage keys are never read, written, or removed.

```js
test("only the fresh twenty-stage rule snapshot is accepted", () => {
  const saved = validStage20Save();
  assert.equal(validSavedGame(saved), true);
  assert.equal(validSavedGame({ ...saved, round: 21 }), false);
  assert.equal(validSavedGame({ ...saved, ruleProgress: { goalAchieved: "yes", sealOpened: false } }), false);
  assert.equal(validSavedGame({ ...saved, rules: { ...saved.rules, sealedLane: 99 } }), false);
});
```

- [ ] **Step 2: Add the stage-20 extra-lane/undo Review Focus test**

Create a 15-lane stage-20 snapshot, add the item lane, store a history entry, restore it, and assert 15/16 lane counts and `ruleProgress` are exact before and after undo.

```js
test("stage twenty undo restores the one-blank rule state around an extra lane", () => {
  const before = stage20Snapshot({ lanes: 15, sealOpened: false });
  const history = [{ state: before.state, moves: 9, extra: false, ruleProgress: before.ruleProgress }];
  const afterItem = stage20Snapshot({ lanes: 16, extra: true, sealOpened: true });
  const saved = saveWith(afterItem, history);
  assert.equal(validSavedGame(saved), true);
  assert.deepEqual(saved.history[0].ruleProgress, before.ruleProgress);
  assert.equal(saved.history[0].state.tubes.length, 15);
});
```

- [ ] **Step 3: Extend progression, tutorial and ranking tests**

Assert 20 sequential clears, stage-20 records, duplicate attempt rejection, rules-version rejection, and fresh keys. Keep local rank ordering and 200-record retention unchanged.

- [ ] **Step 4: Run tests and verify RED**

Run: `node --test saved-game.test.mjs progression.test.mjs leaderboard.test.mjs tutorial.test.mjs`

Expected: FAIL on old keys, five-stage limits and missing rule state.

- [ ] **Step 5: Implement strict v1 validators without migration**

Delete `shortenEarlySave` exports and migration branches. Keep previous storage data untouched by using only the new keys.

- [ ] **Step 6: Run focused and full tests**

Run: `node --test saved-game.test.mjs progression.test.mjs leaderboard.test.mjs tutorial.test.mjs && npm test`

Expected: PASS with no warnings.

- [ ] **Step 7: Commit**

```bash
git add saved-game.js saved-game.test.mjs progression.js progression.test.mjs leaderboard.js leaderboard.test.mjs tutorial.js tutorial.test.mjs
git commit -m "feat: add Twelve Puzzle local persistence"
```

### Task 5: 게임 UI에 20단계와 특수 규칙 연결

**Files:**
- Create: `rule-view.js`
- Create: `rule-view.test.mjs`
- Create: `game-state.js`
- Create: `game-state.test.mjs`
- Modify: `game.js`
- Modify: `index.html`
- Modify: `style.css`
- Modify: `drag.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `generateLevel`, `canRuleMove`, `applyRuleMove`, `legalRuleMoves`, and new save APIs.
- Produces:
  - `ruleSummary(rules, progress, pets) -> string`
  - `laneRuleView(lane, rules, progress, pets) -> { classes, label, locked, markedColor }`
- `makeMoveSnapshot({state,moves,extra,ruleProgress}) -> cloned snapshot` and `restoreMoveSnapshot(snapshot) -> cloned game fields` from `game-state.js`.
- `startGeneratedLevel(current, {mode,seed,round,rule}, generator) -> {ok:true,next} | {ok:false,current,error}`; `next.seed` is the generator's resolved seed.
- `game.js` keeps `rules` and `ruleProgress` beside board state and includes them in save/history.

- [ ] **Step 1: Write failing rule-view tests**

Assert Korean summaries and accessible lane labels for goal pending/complete, marked lane, sealed lane, and combined stage 20 without relying on color alone.

```js
test("combined rule labels describe icons and state without color alone", () => {
  assert.match(ruleSummary(combinedRules, pending, pets), /수호 목표/);
  assert.match(ruleSummary(combinedRules, pending, pets), /봉인/);
  assert.match(laneRuleView(3, combinedRules, pending, pets).label, /잠김/);
  assert.match(laneRuleView(2, combinedRules, pending, pets).label, /전용/);
});
```

- [ ] **Step 2: Add a source-level integration test**

Assert draggable-start, draggable-drop, tap move, legal move enumeration and generator replay import or call `canRuleMove`/`applyRuleMove`; reject direct UI legality checks using only `canPour`.

- [ ] **Step 3: Add failing UI state tests around history and generation errors**

Use `makeMoveSnapshot` and `restoreMoveSnapshot` to assert undo restores `ruleProgress`. Add `startGeneratedLevel(current, request, generator)` to `game-state.js`; assert it uses the resolved seed on success and returns `{ ok:false, current }` on `LevelGenerationError` without replacing a valid board.

```js
test("generation failure preserves the current playable board", () => {
  const current = frozenCurrentGame();
  const result = startGeneratedLevel(current, request, () => { throw new LevelGenerationError("blind", 20, 7); });
  assert.equal(result.ok, false);
  assert.equal(result.current, current);
});
```

- [ ] **Step 4: Run tests and verify RED**

Run: `node --test rule-view.test.mjs game-state.test.mjs drag.test.mjs`

Expected: FAIL because the view helpers and rule-aware UI wiring are absent.

- [ ] **Step 5: Implement 20-stage chapter selection**

Render five accessible chapter groups of four stage buttons, mark locked/completed/current states, and automatically expose the group containing the current stage. Use `stageColumns(config)` rather than `colors + 2`.

- [ ] **Step 6: Wire all moves and state changes through the rule engine**

Store rule progress in move history; render goal, mark and seal state; update status after each move; include rule text in help and stage-start messages.

- [ ] **Step 7: Remove disabled-ad promises from the player flow**

When `nativeAdsEnabled` is false, hide `#supplies`, `#privacySettings`, ad placeholders and revive options. Game-over keeps restart and remaining base items only.

- [ ] **Step 8: Run focused, full and build tests**

Run: `node --test rule-view.test.mjs game-state.test.mjs drag.test.mjs && npm test && npm run build`

Expected: PASS; `dist/` contains no visible disabled-ad copy in `index.html`.

- [ ] **Step 9: Commit**

```bash
git add rule-view.js rule-view.test.mjs game-state.js game-state.test.mjs game.js index.html style.css drag.test.mjs package.json
git commit -m "feat: connect special rules to the game UI"
```

### Task 6: Galmuri 픽셀 타이포그래피와 전체 UI 테마

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `scripts/prepare-fonts.mjs`
- Create: `font-assets.test.mjs`
- Create: `assets/fonts/Galmuri11.woff2` (generated copy)
- Create: `assets/fonts/Galmuri11-Bold.woff2` (generated copy)
- Create: `assets/fonts/OFL-Galmuri.txt` (generated copy)
- Modify: `scripts/build.mjs`
- Modify: `style.css`
- Modify: `index.html`

**Interfaces:**
- `npm run prepare:fonts` copies exact files from `galmuri@2.40.3` into `assets/fonts/`.
- Build output must contain the same three files under `dist/assets/fonts/`.

- [ ] **Step 1: Add failing font asset tests**

Assert package version `2.40.3`, license `OFL-1.1`, source and built WOFF2 files exist and are nonempty, and CSS declares Regular/Bold local `@font-face` sources with `font-display: swap`.

```js
test("pinned Galmuri fonts and license ship in the offline bundle", async () => {
  assert.equal(pkg.dependencies.galmuri, "2.40.3");
  for (const file of ["Galmuri11.woff2", "Galmuri11-Bold.woff2", "OFL-Galmuri.txt"])
    assert.ok((await stat(`assets/fonts/${file}`)).size > 0);
  assert.match(await readFile("style.css", "utf8"), /font-display:\s*swap/);
});
```

- [ ] **Step 2: Run test and verify RED**

Run: `node --test font-assets.test.mjs`

Expected: FAIL because Galmuri and prepared assets are absent.

- [ ] **Step 3: Install and prepare the pinned font**

Run: `npm install --save-exact galmuri@2.40.3`

Implement `scripts/prepare-fonts.mjs`; extend `postinstall` without removing the AdMob patch step; copy fonts during `npm run build`.

- [ ] **Step 4: Apply the approved full pixel UI**

Use Galmuri11 across menus/body and Bold for headings/numbers. Replace rounded soft shadows with 16-bit stepped shadows and pixel borders while preserving minimum readable sizes, visible focus, safe areas and reduced motion.

- [ ] **Step 5: Run tests and inspect responsive pages**

Run: `npm run prepare:fonts && npm run build && node --test font-assets.test.mjs && npm test`

Use the local browser at 320px and 390px to inspect header, stage chapters, help, leaderboard, game-over and stage-20 rule summary. Expected: no document-level horizontal overflow; board viewport alone may scroll.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json scripts/prepare-fonts.mjs font-assets.test.mjs assets/fonts scripts/build.mjs style.css index.html
git commit -m "feat: apply the Galmuri pixel interface"
```

### Task 7: 14종 픽셀 아트, 특수 타일과 앱 아이콘

**Files:**
- Create: `assets/pixel-guardian-atlas.png`
- Create: `assets/pixel-special-atlas.png`
- Create: `assets/pixel-app-icon-source.png`
- Create: `assets/pixel-art-prompt.md`
- Create: `pixel-assets.test.mjs`
- Modify: `guardians.js`
- Modify: `game.js`
- Modify: `style.css`
- Modify: `scripts/icons.mjs`
- Modify: `scripts/build.mjs`
- Modify: `assets/README.md`
- Modify: `package.json`

**Interfaces:**
- Guardian atlas remains a 4×4 grid in current `GUARDIANS` order: rat, ox, tiger, rabbit, dragon, snake, horse, sheep, monkey, rooster, dog, pig, cat, chick, then two transparent cells.
- Special atlas uses fixed labeled cells for question, goal, mark, seal, unlocked seal, sparkle, selection and empty.
- CSS uses `image-rendering: pixelated` and exact integer background positions.

- [ ] **Step 1: Add failing asset contract tests**

With Sharp, assert both atlases exist, dimensions divide exactly by their grids, guardian cells 0..13 contain alpha, cells 14..15 are transparent, special cells contain alpha, and the app icon source is square with alpha.

```js
test("pixel atlases keep the fixed sprite contracts", async () => {
  const guardian = await sharp("assets/pixel-guardian-atlas.png").metadata();
  assert.equal(guardian.width % 4, 0);
  assert.equal(guardian.height % 4, 0);
  assert.equal(await cellHasVisibleAlpha("assets/pixel-guardian-atlas.png", 13, 4, 4), true);
  assert.equal(await cellHasVisibleAlpha("assets/pixel-guardian-atlas.png", 14, 4, 4), false);
  assert.equal(await cellHasVisibleAlpha("assets/pixel-guardian-atlas.png", 15, 4, 4), false);
});
```

- [ ] **Step 2: Run test and verify RED**

Run: `node --test pixel-assets.test.mjs`

Expected: FAIL because the approved pixel assets do not exist.

- [ ] **Step 3: Generate the approved assets**

Use the image generation skill with the existing guardian atlas as identity reference and the approved `포근한 16비트` direction. Generate/edit until the grid, species mapping, no-Chinese-motif constraint, transparency and consistent lighting pass visual inspection. Record the exact prompt and mapping in `assets/pixel-art-prompt.md`.

- [ ] **Step 4: Wire atlas and icon paths**

Update sprite CSS, preload links and build copies. Point icon generation at `assets/pixel-app-icon-source.png` and run `npm run icons`.

- [ ] **Step 5: Verify contract, appearance and native icon outputs**

Run: `node --test pixel-assets.test.mjs && npm run build && npm test`

Inspect each atlas at original resolution and in the browser; verify 14 unique names match images and special icons remain distinguishable without color.

- [ ] **Step 6: Commit**

```bash
git add assets/pixel-guardian-atlas.png assets/pixel-special-atlas.png assets/pixel-app-icon-source.png assets/pixel-art-prompt.md pixel-assets.test.mjs guardians.js game.js style.css scripts/icons.mjs scripts/build.mjs assets/README.md package.json ios/App/App/Assets.xcassets/AppIcon.appiconset android/app/src/main/res/mipmap-* android/app/src/main/res/drawable*/splash.png release-artifacts/google-play-icon-512.png
git commit -m "feat: add cozy pixel art assets"
```

### Task 8: 브랜드·네이티브 메타데이터·문서 정리

**Files:**
- Modify: `release-config.js`
- Modify: `capacitor.config.json`
- Modify: `ios/App/App/Info.plist`
- Modify: `android/app/src/main/res/values/strings.xml`
- Modify: `README.md`
- Modify: `MOBILE.md`
- Modify: `RELEASE.md`
- Modify: `TESTFLIGHT.md`
- Modify: `IOS-VALIDATION.md`
- Modify: `privacy.html`
- Modify: `scripts/release-check.mjs`
- Create: `branding.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Visible name is exactly `열두 퍼즐`; publisher/email/bundle ID remain unchanged.
- Release check continues to block store release on audience/privacy URL but no longer describes the game as five-stage or advertises disabled ads.

- [ ] **Step 1: Add failing branding consistency tests**

Assert visible product fields in web, Capacitor, iOS and Android equal `열두 퍼즐`; bundle ID stays unchanged; current docs contain 20-stage/pixel/local-rank wording and no active-ad claim.

```js
test("all shipped surfaces use the Twelve Puzzle brand", async () => {
  assert.equal(capacitor.appName, "열두 퍼즐");
  assert.equal(capacitor.appId, "com.onewaycompany.twelveguardians");
  assert.match(await readFile("index.html", "utf8"), /열두 퍼즐/);
  assert.match(await readFile("ios\/App\/App\/Info.plist", "utf8"), /<string>열두 퍼즐<\/string>/);
  assert.match(await readFile("android\/app\/src\/main\/res\/values\/strings.xml", "utf8"), /열두 퍼즐/);
});
```

- [ ] **Step 2: Run test and verify RED**

Run: `node --test branding.test.mjs`

Expected: FAIL on existing `열두 수호대` display strings.

- [ ] **Step 3: Update metadata, copy and release documentation**

Keep historical validation facts clearly labeled as prior builds; update current status and manual-test checklist for special rules and pixel assets.

- [ ] **Step 4: Run checks**

Run: `node --test branding.test.mjs && npm test && npm run build && npm run release:check`

Expected: branding/build/tests PASS; `release:check` exits 1 only for the already documented audience/privacy blockers.

- [ ] **Step 5: Commit**

```bash
git add release-config.js capacitor.config.json ios/App/App/Info.plist android/app/src/main/res/values/strings.xml README.md MOBILE.md RELEASE.md TESTFLIGHT.md IOS-VALIDATION.md privacy.html scripts/release-check.mjs branding.test.mjs package.json
git commit -m "chore: rename the game to Twelve Puzzle"
```

### Task 9: 전체 통합·웹·iOS 실기기 검증

**Files:**
- Modify if results require fixes: files owned by Tasks 1~8
- Modify: `IOS-VALIDATION.md`
- Modify: `TESTFLIGHT.md`

**Interfaces:**
- No new public API; this task proves the completed system.

- [ ] **Step 1: Run the clean automated verification**

Run: `npm ci && npm test && npm run build && npm run native:sync && npm run native:doctor`

Expected: all tests PASS, 2,000 generated boards replay, assets/fonts appear in `dist`, native sync succeeds.

- [ ] **Step 2: Run browser integration checks on an isolated origin**

Verify first tutorial, stages 1/5/9/13/17/20, both challenge modes, practice, each item, loss/restart, save/reload, rank idempotency and 320/390px layouts. Record any defect as a failing test before fixing it.

- [ ] **Step 3: Build and verify the signed iPhone development app**

Run the established Xcode Debug command with locally resolved `APPLE_TEAM_ID` and `IPHONE_UDID` environment variables, DerivedData outside Documents, then `codesign --verify --deep --strict`. Do not write the resolved identifiers into the repository or plan.

Expected: arm64 build and code-sign verification succeed; bundle display name is `열두 퍼즐`.

- [ ] **Step 4: Install and launch without deleting app data**

Use `xcrun devicectl device install app` and launch `com.onewaycompany.twelveguardians`. If the device is locked, stop at the user action instead of claiming launch success.

- [ ] **Step 5: Complete the manual iPhone checklist**

User checks real finger drag/scroll on stages 1, 5, 13, 17 and 20; lock/background restore; rule labels; pixel readability; elapsed play time. Do not mark those items complete from process launch alone.

- [ ] **Step 6: Update evidence and run final diff checks**

Run: `git diff --check && git status --short && npm test`

Update validation docs with exact pass counts, build paths, device outcome and remaining human-only checks.

- [ ] **Step 7: Commit final verification records**

```bash
git add IOS-VALIDATION.md TESTFLIGHT.md
git commit -m "test: verify Twelve Puzzle v1"
```

## Execution Order and Agent Boundaries

- Tasks 1~4 are interface-dependent and must run in order.
- Task 5 depends on Tasks 1~4.
- Task 6 may run after Task 1 and in parallel with Tasks 2~4 if a separate agent is available.
- Task 7 may generate draft art in parallel, but final wiring waits for Task 5 and font/theme review from Task 6.
- Task 8 waits for Tasks 5~7 so current documentation matches the final product.
- Task 9 is always last.
- Every task receives its own spec compliance and code-quality review before the next dependent task begins; the final branch receives a whole-system review.
