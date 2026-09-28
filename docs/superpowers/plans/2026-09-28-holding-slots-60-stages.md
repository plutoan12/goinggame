# 열두 퍼즐 임시 보관칸·60단계 확장 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 자유 보관칸, 자동 물음표 공개와 완급이 있는 60단계를 기존 네이티브 열두 퍼즐에 추가하고 저장·순위·아이템·조작까지 일관되게 연결한다.

**Architecture:** 기존 숫자 기반 메인 세로줄 엔진은 생성기 호환을 위해 유지하고, `{ kind, index }` 위치를 받는 상위 전송 API를 추가한다. 보관칸은 `state.holding`의 1장짜리 슬롯으로 관리하며 특수 규칙, 감사 로그, 저장 검증과 UI는 모두 같은 위치 모델을 사용한다. 단계는 명시적인 60개 설정으로 고정하고 생성된 정답 경로와 숨김 비율을 검증한다.

**Tech Stack:** Vanilla JavaScript ES modules, Node.js test runner, HTML/CSS, Capacitor 8, iOS/Android native shells

**Spec:** `docs/superpowers/specs/2026-09-28-holding-slots-60-stages-design.md`

## Global Constraints

- 사용자 노출 이름은 `열두 퍼즐`, 번들 식별자는 `com.onewaycompany.twelveguardians`를 유지한다.
- 고양이·병아리와 열두 수호동물 14종, 포근한 16비트 픽셀 스타일과 자체 호스팅 Galmuri 글꼴을 유지한다.
- 메인 세로줄에는 종류와 관계없이 공개된 맨 위 동물 한 마리를 놓을 수 있다.
- 보관칸은 한 칸당 한 마리이며 메인↔보관만 허용하고 보관↔보관은 금지한다.
- 새 맨 위 물음표는 이동 직후 자동 공개하고 별도 이동 수를 사용하지 않는다.
- 일반 단계 목표 시간은 5~12분, 구간 보스는 최대 15~20분이다.
- 16칸·14종·93.75% 숨김·기본 보관칸 0개 조합은 60단계에만 사용한다.
- 광고는 기본 비활성 상태를 유지하며 실제 광고 송출, 온라인 순위와 스토어 제출은 범위에서 제외한다.
- 모든 규칙 판정은 DOM과 분리된 순수 함수로 구현한다.

## Review Focus

- 손상 저장에서 보관칸 길이가 단계 설정과 다르거나 동물이 중복·누락되면 복원과 순위 등록을 모두 거부해야 한다. Task 4의 저장 검증 테스트로 고정한다.
- 봉인·표식·수호 목표가 메인↔보관 이동을 우회하지 못해야 한다. Task 3의 규칙 전송 테스트로 고정한다.
- 마지막 허용 이동이 보관칸을 비우며 완성될 때 제한 소진보다 승리가 우선해야 한다. Task 3의 결과 판정 테스트로 고정한다.
- 60단계 생성이 후보 고갈이나 과도한 실행 시간 없이 검증된 정답과 목표 숨김 비율을 제공해야 한다. Task 2의 전체 카탈로그 재생 테스트로 고정한다.
- 드래그 취소, 앱 전환과 보관칸이 찬 상태의 잘못된 드롭이 동물·이동 수·아이템을 바꾸지 않아야 한다. Task 5의 조작 테스트로 고정한다.

---

## File Structure

- `stage-config.js`: 60개 단계, 보관칸 수, 숨김·시간·해답 길이 목표와 10단계 장 구분
- `engine.js`: 위치 모델, 보관칸 전송, 자동 공개, 승리와 합법 이동 열거
- `level-generator.js`: 보관칸이 포함된 초기 상태, 숨김 비율과 해답 길이 후보 검증
- `rules.js`: 위치 기반 수호 목표·표식·봉인 판정
- `session.js`: 제한, 교착, 보관칸 추가 아이템과 결과 우선순위
- `game-state.js`: 위치 이동을 포함하는 되돌리기 스냅샷
- `saved-game.js`: 새 저장 버전, 위치 기반 감사 로그 재생과 변조 검증
- `leaderboard.js`, `progression.js`: 60단계 규칙 버전 순위와 기존 해금 보존
- `index.html`, `game.js`: 보관칸 표시, 위치 선택·이동, 아이템·안내 문구
- `drag.js`: 메인 세로줄과 보관칸을 함께 다루는 포인터 드래그
- `tutorial.js`, `tutorial-view.js`: 보관칸 넣기·꺼내기 튜토리얼
- `style.css`, `motion.js`: 고정 보관칸, 양방향 보드 스크롤, 픽셀 공개·추가 연출
- 기존 `*.test.mjs`: 각 책임 파일의 회귀·신규 테스트

### Task 1: 60단계 카탈로그와 난이도 파형

**Files:**
- Modify: `stage-config.js`
- Modify: `stage-config.test.mjs`
- Modify: `progression.test.mjs`

**Interfaces:**
- Produces: `STAGES[0..59]` with `{ name, colors, capacity, hiddenDepth, blanks, holdingSlots, petOffset, ruleKinds, markedCount, timeLimitMs, maxSolutionSteps, minHiddenRatio }`
- Produces: `levelConfig(mode, round)` preserving those fields and returning `petIds`
- Produces: `stageGroups()` returning six `{ start, end, label }` groups of ten stages

- [ ] **Step 1: Write failing catalog tests**

Add tests asserting `STAGES.length === 60`, six 10-stage groups, every stage has `holdingSlots` in `0..3`, and these milestone values:

```js
assert.deepEqual(pick(STAGES[29]), { colors: 14, capacity: 10, holdingSlots: 2 });
assert.deepEqual(pick(STAGES[39]), { colors: 14, capacity: 12, holdingSlots: 1 });
assert.deepEqual(pick(STAGES[49]), { colors: 14, capacity: 14, holdingSlots: 1 });
assert.deepEqual(pick(STAGES[59]), {
  colors: 14, capacity: 16, hiddenDepth: 15,
  blanks: 1, holdingSlots: 0, timeLimitMs: 1_200_000,
});
```

Also assert stages ending in 4 and 8 are relief rows with exactly three blank tubes while ordinary rows have two and stage 60 has one; only stage 60 combines capacity 16 with zero holding slots.
For equal-size ordinary late stages, assert `petIds` rotate while always containing IDs 12 and 13 for 고양이 and 병아리; boss stages 30, 40, 50 and 60 must contain all `PET_ORDER` entries.

- [ ] **Step 2: Run the catalog tests and verify they fail**

Run: `node --test stage-config.test.mjs progression.test.mjs`

Expected: FAIL because the catalog still has 20 stages and no `holdingSlots`.

- [ ] **Step 3: Replace the 20-row table with the approved 60-row table**

Keep stages 1~19 names, rename the old stage 20 boss to avoid duplicating the final title, and add Korean nature-themed names for 21~60. Use the following exact 10-stage chapter vectors; offset 4 and 8 are relief rows:

```text
capacity: [4,4,5,4,5,5,6,5,6,6] [6,6,7,6,7,7,8,7,8,8] [8,8,9,8,9,9,10,9,10,10] [9,10,10,9,10,11,11,10,11,12] [10,11,11,10,12,12,13,11,13,14] [12,12,13,12,13,13,14,12,14,16]
colors:   [4,5,6,5,6,7,8,6,8,8] [8,9,10,8,9,10,11,9,11,11] [10,11,12,10,11,12,12,10,12,14] repeated for chapters 4~6
hidden:   [1,1,2,1,2,2,2,1,2,2] [2,3,3,2,3,4,4,3,4,4] [4,5,5,4,5,6,6,5,7,7] [6,7,8,6,8,9,9,7,10,10] [8,9,10,8,10,11,11,9,12,12] [11,11,12,10,12,12,13,11,13,15]
holding:  [3,3,3,3,3,3,3,3,3,3] [3,3,3,3,3,3,2,3,2,2] [2,2,2,2,2,2,2,2,2,2] [2,2,2,2,2,2,1,2,1,1] [1,1,1,1,1,1,1,1,1,1] [1,1,1,1,1,1,1,1,1,0]
seconds:  [120,140,160,140,180,200,220,180,240,240] [240,270,300,240,300,330,360,300,390,420] [300,330,360,300,390,420,450,360,480,540] [420,450,480,420,510,540,600,480,660,720] [480,540,600,480,660,720,780,600,840,900] [600,660,720,600,780,840,900,720,900,1200]
```

Use boss rows 30, 40, 50 and 60 for all 14 animals, ordinary late rows for 10~12 animals, and stage 60 for the only 16-capacity/zero-holding combination. Add `petOffset` and make `levelConfig` select 고양이·병아리 plus a cyclic slice of the 12 zodiac IDs so equal-size ordinary stages rotate their cast without duplicates. Set `maxSolutionSteps` by chapter to `80, 120, 160, 200, 240, 280`, with stage 60 at `320`; set chapter minimum hidden ratios to `0.10, 0.35, 0.55, 0.65, 0.75, 0.85` and stage 60 to `0.90`.

- [ ] **Step 4: Generalize stage-derived rules**

Set `markedCount` in each row instead of hard-coding stage 11/12 elsewhere. For stages 21~60 use the exact per-chapter offsets: 1~4 basic, 5 goal, 6 marked, 7 sealed, 8 relief/basic, 9 goal+marked, 10 goal+marked+sealed; boss rows with marked rules use two marked lanes.

- [ ] **Step 5: Run catalog and progression tests**

Run: `node --test stage-config.test.mjs progression.test.mjs`

Expected: PASS with 60 sequentially accessible stages and six groups.

- [ ] **Step 6: Commit the catalog**

```bash
git add stage-config.js stage-config.test.mjs progression.test.mjs
git commit -m "feat: expand journey to sixty stages"
```

### Task 2: 위치 기반 보관칸 엔진과 검증된 생성

**Files:**
- Modify: `engine.js`
- Modify: `level-generator.js`
- Modify: `game-state.js`
- Modify: `engine.test.mjs`
- Modify: `level-generator.test.mjs`
- Modify: `game-state.test.mjs`

**Interfaces:**
- Produces: `tube(index)` and `holding(index)` location factories
- Produces: `topAt(state, location) -> number | null`
- Produces: `canTransfer(state, from, to) -> boolean`
- Produces: `applyTransfer(state, from, to) -> state`
- Produces: `legalTransfers(state) -> Array<{ from, to, count: 1 }>`
- Preserves: numeric `canPour`, `applyMove` and generated tube-only witness solutions
- Produces: generated states with `holding: Array(config.holdingSlots).fill(null)`

- [ ] **Step 1: Write failing engine tests for all location pairs**

Cover tube→tube, tube→empty holding, holding→non-full tube, and rejection of holding→holding, occupied holding, hidden source and out-of-range locations. Assert a tube→holding move exposes the new top tile automatically and leaves its input unchanged.

```js
const moved = applyTransfer(state, tube(0), holding(0));
assert.equal(moved.holding[0], 1);
assert.equal(moved.hidden[0].at(-1), false);
assert.deepEqual(state, original);
```

Add tests that `isWin` is false while any holding slot is occupied and `legalTransfers` includes both directions where legal.

- [ ] **Step 2: Run the engine tests and verify they fail**

Run: `node --test engine.test.mjs game-state.test.mjs`

Expected: FAIL because location APIs and `state.holding` do not exist.

- [ ] **Step 3: Implement the location transfer API in `engine.js`**

Validate `{ kind: "tube" | "holding", index }` strictly. Keep tube arrays bottom-to-top, store `null` or a pet ID in each holding slot, reveal only a tube source's new top after a successful transfer, and clone `holding` in `cloneState`. Extend `isWin` and `legalTransfers` without changing the existing numeric wrappers used by the generator.

- [ ] **Step 4: Add holding state to snapshots**

Keep `makeMoveSnapshot({ state, moves, holdingBoosted, ruleProgress })` and `restoreMoveSnapshot(snapshot)` as clone-producing pure functions. Replace the old `extra` field; a snapshot must restore both slot contents and whether the +1 item was used.

- [ ] **Step 5: Write failing generator tests**

For every stage in both modes and seeds 1~5, assert the generated holding length equals `config.holdingSlots`, every slot begins `null`, the tube-only witness still wins, and blind boards meet the stage's configured minimum hidden ratio. Assert compact witness length does not exceed `config.maxSolutionSteps`.

- [ ] **Step 6: Implement generated holding and candidate filters**

Add `hiddenRatio(state)` to `level-generator.js`. Initialize holding after base generation, derive marked lanes from `config.markedCount`, reject candidates below the configured hidden threshold or above `maxSolutionSteps`, and retain the existing bounded candidate/seed retry behavior.

- [ ] **Step 7: Run engine and generator tests**

Run: `node --test engine.test.mjs level-generator.test.mjs game-state.test.mjs`

Expected: PASS for all 60 stages in both modes.

- [ ] **Step 8: Commit the engine**

```bash
git add engine.js level-generator.js game-state.js engine.test.mjs level-generator.test.mjs game-state.test.mjs
git commit -m "feat: add free holding slot engine"
```

### Task 3: 특수 규칙·제한·아이템 통합

**Files:**
- Modify: `rules.js`
- Modify: `session.js`
- Modify: `rules.test.mjs`
- Modify: `session.test.mjs`
- Modify: `level-generator.test.mjs`

**Interfaces:**
- Consumes: `topAt`, `canTransfer`, `applyTransfer`, `legalTransfers`, location factories from Task 2
- Produces: `canRuleTransfer(state, from, to, rules, progress)`
- Produces: `applyRuleTransfer(state, from, to, rules, progress)`
- Produces: `legalRuleTransfers(state, rules, progress)`
- Preserves: numeric `canRuleMove`/`applyRuleMove` wrappers for tube-only witness replay
- Produces: `addHoldingSlot(state) -> state`

- [ ] **Step 1: Write failing special-rule transfer tests**

Assert sealed tubes cannot send to or receive from holding; a held wrong pet cannot enter a marked tube; a held pet completing the goal updates `goalAchieved` and `sealOpened`; and a non-goal held pet cannot complete first.

- [ ] **Step 2: Run rule tests and verify they fail**

Run: `node --test rules.test.mjs session.test.mjs`

Expected: FAIL because rules accept numeric tube indices only.

- [ ] **Step 3: Implement location-aware rule functions**

Apply source restrictions only when `from.kind === "tube"`, destination marked/sealed restrictions only when `to.kind === "tube"`, and completion checks only for a tube destination. Implement numeric wrappers by converting both indices to tube locations so existing generator replay remains valid.

- [ ] **Step 4: Replace blocked-state and item semantics**

Use `legalRuleTransfers` when the controller asks `outcome`. Implement `addHoldingSlot(state)` to append exactly one `null`; rename session/controller state from `extra` to `holdingBoosted`; allow the item once per run, including base-zero stages; and do not extend exhausted time or moves.

- [ ] **Step 5: Add result-order and rescue tests**

Assert a final holding→tube completion returns `won` even when it consumes the last move, a full holding tray alone is not blocked when a tube destination exists, and `canReturnToItemsAfterLoss("blocked")` is true only when undo or the unused +1 holding item can create a move.

- [ ] **Step 6: Replay every generated witness with special rules**

Run: `node --test rules.test.mjs session.test.mjs level-generator.test.mjs`

Expected: PASS, including all combined-rule boss stages.

- [ ] **Step 7: Commit rule integration**

```bash
git add rules.js session.js rules.test.mjs session.test.mjs level-generator.test.mjs
git commit -m "feat: apply stage rules to holding moves"
```

### Task 4: 저장 감사 로그·진행·순위 버전 갱신

**Files:**
- Modify: `saved-game.js`
- Modify: `leaderboard.js`
- Modify: `progression.js`
- Modify: `saved-game.test.mjs`
- Modify: `save-writer.test.mjs`
- Modify: `leaderboard.test.mjs`
- Modify: `progression.test.mjs`

**Interfaces:**
- Consumes: location transfers and `holdingBoosted` from Tasks 2~3
- Produces: `SAVE_KEY = "twelve-puzzle-game-v4"`, payload `version: 3`
- Produces: move audit `{ type: "move", from: location, to: location }`
- Produces: item audit `{ type: "holding-plus" }`
- Produces: `RANK_VERSION = "twelve-puzzle-rules-v4"`, `RANK_KEY = "twelve-puzzle-rankings-v4"`

- [ ] **Step 1: Write failing state and audit validation tests**

Test a valid save with a pet in holding, rejection of the wrong holding length, occupied count mismatch, invalid location kind/index, holding→holding audit, a second `holding-plus`, and a saved final state that cannot be reproduced from its audit.

- [ ] **Step 2: Run persistence tests and verify they fail**

Run: `node --test saved-game.test.mjs save-writer.test.mjs leaderboard.test.mjs progression.test.mjs`

Expected: FAIL against the v3 numeric audit format.

- [ ] **Step 3: Implement v4 state validation and replay**

Count pets across `tubes.flat()` and non-null `holding`, while hidden arrays continue to correspond only to tubes. Replay location moves through `applyRuleTransfer`, snapshot `holdingBoosted`, append one slot for `holding-plus`, and require exact holding equality in `sameState` and completion audits.

- [ ] **Step 4: Preserve progress but invalidate incompatible active runs**

Keep `PROGRESS_KEY` and accept existing valid `cleared` values through 20, now bounded by 60. Ignore the old active-game key and old ranking key; do not mutate or delete either. Add a test that a stored `{ version: 1, cleared: 20 }` unlocks stage 21.

- [ ] **Step 5: Expand and version local rankings**

Allow stages 1~60, include holding-plus usage in `itemsUsed`, keep stage+seed+rule+assisted filtering, and reject old rules-version records. Assert assisted and unassisted records never share a rank list.

- [ ] **Step 6: Run persistence tests**

Run: `node --test saved-game.test.mjs save-writer.test.mjs leaderboard.test.mjs progression.test.mjs`

Expected: PASS including corrupted-holding and audit-tampering cases.

- [ ] **Step 7: Commit persistence**

```bash
git add saved-game.js leaderboard.js progression.js saved-game.test.mjs save-writer.test.mjs leaderboard.test.mjs progression.test.mjs
git commit -m "feat: persist and rank holding slot runs"
```

### Task 5: 보관칸 화면·탭·드래그·튜토리얼

**Files:**
- Modify: `index.html`
- Modify: `game.js`
- Modify: `drag.js`
- Modify: `tutorial.js`
- Modify: `tutorial-view.js`
- Modify: `drag.test.mjs`
- Modify: `tutorial.test.mjs`
- Modify: `rule-view.test.mjs`
- Modify: `branding.test.mjs`

**Interfaces:**
- Consumes: location transfer/rule/session APIs from Tasks 2~3
- Produces: DOM targets with `data-location-kind` and `data-location-index`
- Produces: `attachTileDrag(surface, viewport, { canStart, canDrop, drop })` using location objects
- Produces: tutorial guide steps whose `from` and `to` are location objects

- [ ] **Step 1: Write failing interaction and tutorial tests**

Assert drag source/target parsing preserves location kinds, drag cancel and occupied-holding drops never call `drop`, and post-drag click suppression still works. Update the tutorial to require tube→holding, tube→tube and holding→tube, ending with an empty holding tray and a solved board.

- [ ] **Step 2: Run interaction tests and verify they fail**

Run: `node --test drag.test.mjs tutorial.test.mjs rule-view.test.mjs branding.test.mjs`

Expected: FAIL because the current controller and tutorial only address numbered tubes.

- [ ] **Step 3: Add the holding tray markup and renderer**

Place `#holdingTray` between the run status and `#boardViewport`, with an accessible label and live count. Render each slot as a button-like target; for zero-slot stages render the `보관칸 없음` badge. Keep the tray outside the board scroll container.

- [ ] **Step 4: Convert controller selection and movement to locations**

Replace numeric selected-lane state with a selected location. Route tap, keyboard and drag moves through `canRuleTransfer`/`applyRuleTransfer`; write location audit events; save after every successful move; and animate the actual source and destination elements. Invalid moves must not change moves, history, items or timer start.

- [ ] **Step 5: Replace the old item and copy**

Rename `보조 칸` to `보관칸 +1`, call `addHoldingSlot`, clear history, write `holding-plus`, mark the run assisted, and update help/game-over text. Preserve the disabled state after one use.

- [ ] **Step 6: Generalize pointer dragging**

Attach dragging to a common play surface containing board and holding tray. Highlight all legal tube/holding targets, preserve horizontal board auto-scroll and page vertical auto-scroll, and cancel cleanly on pointer cancel, blur, visibility change and Escape.

- [ ] **Step 7: Implement the holding tutorial**

Use one local tutorial holding slot and version its completion key so existing development devices see the new lesson once. The tutorial must not write a run, progression or rank.

- [ ] **Step 8: Run interaction tests and build**

Run: `node --test drag.test.mjs tutorial.test.mjs rule-view.test.mjs branding.test.mjs && npm run build`

Expected: PASS and generated output contains the tray, new item label and no old `보조 칸` copy.

- [ ] **Step 9: Commit interaction work**

```bash
git add index.html game.js drag.js tutorial.js tutorial-view.js drag.test.mjs tutorial.test.mjs rule-view.test.mjs branding.test.mjs
git commit -m "feat: add holding tray interactions"
```

### Task 6: 픽셀 연출과 긴 보드 반응형 레이아웃

**Files:**
- Modify: `style.css`
- Modify: `motion.js`
- Modify: `motion.test.mjs`
- Modify: `build-output.test.mjs`

**Interfaces:**
- Consumes: tray and location data attributes from Task 5
- Produces: `.holding-tray`, `.holding-slot`, `.holding-empty`, `.holding-added`, `.reveal-flip`, `.valid-target` visual states

- [ ] **Step 1: Write failing asset/style contract tests**

Assert the built CSS contains dedicated holding states, a bounded vertically scrollable board viewport, minimum 44px interactive slots, reduced-motion overrides, and no emoji or Chinese-themed visual assets.

- [ ] **Step 2: Run style tests and verify they fail**

Run: `node --test motion.test.mjs build-output.test.mjs`

Expected: FAIL because holding selectors and vertical board bounds are absent.

- [ ] **Step 3: Style the fixed tray and two-axis board**

Keep the tray visible above `#boardViewport`; let the board viewport scroll horizontally and vertically with momentum; retain readable tile dimensions at capacities 14 and 16; and provide visible selected, valid, invalid, occupied and newly-added states without relying on color alone.

- [ ] **Step 4: Add restrained pixel motion**

Use existing motion helpers for one transfer animation, then flip only the newly exposed tile. Add one short slot-assembly animation for the +1 item. In reduced-motion mode, apply final state immediately with no transform or transition delay.

- [ ] **Step 5: Verify representative layouts in the in-app browser**

Capture and inspect stage 1 plus fixture states equivalent to capacities 8, 12 and 16 at 320px and 390px widths. Confirm the tray remains visible, no controls overlap, and both board scroll axes are reachable.

- [ ] **Step 6: Run style and full browser build tests**

Run: `node --test motion.test.mjs build-output.test.mjs && npm run build && npm test`

Expected: PASS.

- [ ] **Step 7: Commit visual integration**

```bash
git add style.css motion.js motion.test.mjs build-output.test.mjs
git commit -m "feat: polish holding tray and long boards"
```

### Task 7: 전체 회귀·네이티브 동기화·실기기 점검

**Files:**
- Modify: `README.md`
- Modify: `MOBILE.md`
- Modify: `IOS-VALIDATION.md`
- Modify: `scripts/release-check.mjs`
- Test: all `*.test.mjs`

**Interfaces:**
- Consumes: all previous tasks
- Produces: synchronized Capacitor web assets, iOS simulator build and Android debug APK

- [ ] **Step 1: Add release-check assertions**

Require 60 stages, the v4 save/rank keys, the holding tray markup, disabled production ads and the unchanged bundle ID. Reject stale old item copy in built output.

- [ ] **Step 2: Run the complete automated suite**

Run: `git diff --check && npm test && npm run build && npm run release:check`

Expected: all tests pass, production assets contain no remote font/image dependency, and release checks pass.

- [ ] **Step 3: Stress the 60-stage generator**

Run a deterministic script over both modes, stages 1~60 and at least 20 seeds per stage. Replay every witness, record generation duration, compact solution length and hidden ratio, and fail on an unsolved board, configuration-bound violation or retry exhaustion.

- [ ] **Step 4: Synchronize native projects**

Run: `npm run native:sync && npm run native:doctor`

Expected: Capacitor sync and native doctor pass with ads disabled.

- [ ] **Step 5: Build Android and unsigned iOS targets**

Run:

```bash
npm run android:debug
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'generic/platform=iOS' -derivedDataPath release-artifacts/ios-derived CODE_SIGNING_ALLOWED=NO build
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'generic/platform=iOS Simulator' -derivedDataPath release-artifacts/ios-derived CODE_SIGNING_ALLOWED=NO build
```

Expected: `BUILD SUCCESSFUL` for Android and `** BUILD SUCCEEDED **` for both iOS targets.

- [ ] **Step 6: Perform iPhone smoke testing when signing is available**

Install the development build and manually check stages 1, 10, 30 and a debug-unlocked 60 fixture: tube↔holding tap and drag, automatic reveal, +1 slot, undo, save/resume, blocked recovery, stage unlock and rank classification. If Apple team signing is unavailable, preserve simulator evidence and report that single external blocker without weakening automated checks.

- [ ] **Step 7: Update operator documentation**

Document 60-stage progression, item behavior, save migration, local ranking scope, the exact web/native verification commands and the remaining store-release blockers.

- [ ] **Step 8: Final verification and commit**

Run: `git diff --check && npm test && npm run build && npm run release:check && git status --short`

Expected: all checks pass and only intentionally ignored build artifacts remain untracked.

```bash
git add README.md MOBILE.md IOS-VALIDATION.md scripts/release-check.mjs ios android
git commit -m "docs: validate sixty-stage native release"
```

## Self-Review Result

- **Spec coverage:** 보관 규칙, 자동 공개, 특수 규칙, 60단계 파형, 아이템, 화면, 저장, 순위, 오류 처리와 네이티브 검증이 Tasks 1~7에 각각 연결되어 있다.
- **Step scan:** 각 작업은 실패 테스트, 최소 구현, 통과 확인과 커밋으로 끝난다. 화면 실기기 확인처럼 자동화할 수 없는 항목은 별도 수동 단계로 분리했다.
- **Type consistency:** 모든 신규 이동은 `{ kind, index }`; 저장·규칙·UI가 `canRuleTransfer`/`applyRuleTransfer`를 공유한다. `extra`는 전 계층에서 `holdingBoosted`, 감사 이벤트는 `holding-plus`로 통일한다.
- **Review Focus:** 손상 저장, 규칙 우회, 마지막 수 승리, 생성기 고갈과 취소 제스처가 각각 Tasks 2~5의 구체 테스트에 포함되어 있다.
- **Proportion:** 구현 본문은 쓰지 않고 외부 계약, 검증할 값과 책임 경계만 고정했다.
