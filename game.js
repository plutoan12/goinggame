import {
  cloneState,
  topColor,
  isTubeDone,
  isWin,
  revealCompleted,
} from "./engine.js";
import { STAGES, levelConfig, stageColumns } from "./stage-config.js";
import { generateLevel } from "./level-generator.js";
import { canRuleMove, applyRuleMove, legalRuleMoves } from "./rules.js";
import { laneRuleView, ruleSummary } from "./rule-view.js";
import {
  makeMoveSnapshot,
  restoreMoveSnapshot,
  startGeneratedLevel,
} from "./game-state.js";
import { flyTile, nudge, celebrate } from "./motion.js";
import { attachTileDrag } from "./drag.js";
import { createProgression } from "./progression.js";
import { createTutorial } from "./tutorial.js";
import { createTutorialView } from "./tutorial-view.js";
import { SAVE_KEY, createSaveWriter, validSavedGame } from "./saved-game.js?v=save-3";
import {
  GUARDIANS as PETS,
  SPECIAL_SPRITES,
  createPetArtElement,
  watchPetAtlas,
} from "./guardians.js?v=pixel-1";
import {
  createRun,
  outcome,
  consumeItem,
  revealLane,
  elapse,
  formatTime,
  canReturnToItemsAfterLoss,
} from "./session.js?v=limits-1";
import {
  createLeaderboard,
  makeRecord,
  rankRecords,
  scoreLabel,
} from "./leaderboard.js?v=ranks-4";
import { renderLeaderboard } from "./leaderboard-view.js?v=ranks-4";

const $ = (id) => document.getElementById(id);
let boardDrag;
let clockStamp = null,
  paused = false,
  timeLossShown = false;
let run;
function newAttemptId() {
  return [...crypto.getRandomValues(new Uint32Array(4))]
    .map((n) => n.toString(16).padStart(8, "0"))
    .join("-");
}
let attemptId = newAttemptId();
let rankStorage;
try {
  rankStorage = localStorage;
} catch {
  /* In-memory fallback. */
}
const leaderboard = createLeaderboard(rankStorage);
const progression = createProgression(rankStorage);
const tutorial = createTutorial(rankStorage);
let mode = "blind",
  seed = 26491,
  round = 1,
  state,
  rules,
  ruleProgress,
  history = [],
  audit = [],
  moves = 0,
  extra = false;
let selected = null,
  sound = false,
  audio,
  dialogAction = () => $("dialog").close();
let lastMove = null;
let busy = false;
let saveWarning = false;
const gameSaveWriter = createSaveWriter(rankStorage, SAVE_KEY, () => {
  saveWarning = true;
});
try {
  sound = localStorage.getItem("pet-sort-sound") === "on";
} catch {
  /* Optional preference. */
}

watchPetAtlas(Image, document.documentElement, "./assets/pixel-guardian-atlas.png");

function petArt(id) {
  return createPetArtElement(document, PETS, id);
}
function specialArt(kind) {
  const id = SPECIAL_SPRITES[kind];
  const art = document.createElement("span");
  art.className = `special-art special-${kind}`;
  art.style.setProperty("--special-x", `${((id % 4) * 100) / 3}%`);
  art.style.setProperty("--special-y", `${Math.floor(id / 4) * 100}%`);
  art.setAttribute("aria-hidden", "true");
  return art;
}
function petFor(color) {
  return PETS[levelConfig(mode, round).petIds[color]];
}
function stagePets() {
  return levelConfig(mode, round).petIds.map((id) => PETS[id]);
}
function gameOutcome() {
  return outcome(
    state,
    moves,
    run,
    mode,
    () => legalRuleMoves(state, rules, ruleProgress),
  );
}

const tutorialView = createTutorialView(tutorial, {
  petArt,
  onComplete() {
    $("dialogTitle").textContent = "이제 본게임에 도전해요";
    $("dialogKicker").textContent = "연습 완료 · 순위 기록 없음";
    $("dialogAction").textContent = moves || progression.cleared ? "이어서 플레이" : "입문 시작";
    $("dialogAction").focus({ preventScroll: true });
  },
});

function showTutorial() {
  if (busy) return;
  boardDrag?.cancel();
  modal("세 번 옮기며 배워요", "", "나중에 할게요", undefined, "첫걸음 · 고양이와 병아리");
  $("dialog").classList.add("tutorial-dialog");
  tutorialView.restart();
  $("dialogBody").replaceChildren(tutorialView.root);
  // Main run, timer, items, progression and leaderboard remain untouched.
  $("dialogBody").querySelector("[data-lane='0']").focus({ preventScroll: true });
}

function setBusy(value) {
  busy = value;
  $("board").setAttribute("aria-busy", String(value));
  for (const id of [
    "undo",
    "extra",
    "peek",
    "restart",
    "newGame",
    "mode",
    "help",
    "gameStatus",
    "challenge",
    "pause",
    "rankings",
  ])
    $(id).disabled = value;
  updateStageButtons();
}

function updateStageButtons() {
  document.querySelectorAll(".stage-button").forEach((button, index) => {
    const unlocked = progression.canAccess(index + 1);
    const stage = STAGES[index];
    button.disabled = busy || !unlocked;
    button.classList.toggle("locked", !unlocked);
    button.setAttribute("aria-pressed", index + 1 === levelConfig(mode, round).tier);
    const status = !unlocked ? `${STAGES[index - 1].name} 클리어 후` :
      progression.cleared >= index + 1 ? "클리어 ✓" : `${stageColumns(stage)}열 × ${stage.capacity}칸`;
    button.querySelector("small").textContent = status;
    button.setAttribute("aria-label", `${index + 1}단계 ${stage.name}, ${status}${unlocked ? "" : ", 잠김"}`);
    button.title = status;
  });
  document.querySelectorAll(".stage-chapter").forEach((chapter) => {
    const start = Number(chapter.dataset.start);
    const end = Number(chapter.dataset.end);
    chapter.open = round >= start && round <= end;
  });
}

function save() {
  const stored = gameSaveWriter.write({
    version: 2,
    mode,
    seed,
    round,
    state,
    moves,
    extra,
    rules,
    ruleProgress,
    run,
    attemptId,
    audit,
    history: history.slice(-100),
  });
  saveWarning = gameSaveWriter.storageError;
  return stored;
}
function restore() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!validSavedGame(saved) || !progression.canAccess(saved.round)) return false;
    ({ mode, seed, round, state, moves, extra, rules, ruleProgress, run } = saved);
    attemptId = saved.attemptId;
    paused = run.rule === "timed" && run.clockStarted;
    audit = structuredClone(saved.audit);
    history = structuredClone(saved.history);
    return true;
  } catch {
    return false;
  }
}
function tell(text, error = false) {
  if (saveWarning) {
    $("message").textContent = "저장 공간 문제로 현재 판은 이번 실행에서만 유지돼요. 앱을 닫으면 진행이 사라질 수 있어요.";
    $("message").classList.add("error");
    return;
  }
  $("message").textContent = text;
  $("message").classList.toggle("error", error);
}
function settleClock() {
  if (clockStamp !== null) run = elapse(run, performance.now() - clockStamp);
  clockStamp = null;
}
function syncClock() {
  settleClock();
  if (
    run.rule === "timed" &&
    mode !== "practice" &&
    run.clockStarted &&
    !paused &&
    !busy &&
    !document.hidden &&
    !$("dialog").open &&
    gameOutcome() === "playing"
  )
    clockStamp = performance.now();
  updateLimitDisplay();
}
function updateLimitDisplay() {
  const timed = run.rule === "timed" && mode !== "practice";
  const remaining = Math.max(0, run.limit - moves);
  $("limitLabel").textContent = timed ? "남은 시간" : "남은 이동";
  $("remaining").textContent =
    mode === "practice"
      ? "무제한"
      : timed
        ? formatTime(run.remainingMs)
        : `${remaining}수`;
  $("remaining").classList.toggle(
    "warning",
    mode !== "practice" && (timed ? run.remainingMs <= 15000 : remaining <= 10),
  );
  $("limitDetail").textContent =
    mode === "practice"
      ? "시간·횟수 제한 없음"
      : timed
        ? `${run.remainingMs <= 0 ? "시간 종료" : !run.clockStarted ? "첫 이동부터 시작" : paused ? "일시정지 중" : "시간 안에 완성하세요"} · 총 ${formatTime(run.timeLimitMs + (run.revived ? 60000 : 0))}`
        : `${moves} / ${run.limit}수 사용 · 잘못 누르면 차감하지 않아요`;
  $("limitBar").max = timed
    ? run.timeLimitMs + (run.revived ? 60000 : 0)
    : run.limit;
  $("limitBar").value =
    mode === "practice" ? run.limit : timed ? run.remainingMs : remaining;
  $("limitBar").setAttribute(
    "aria-label",
    timed ? "남은 시간 비율" : "남은 이동 비율",
  );
  $("pause").hidden = !timed;
  $("pause").textContent = paused ? "▶ 계속하기" : "Ⅱ 잠시 멈춤";
  $("pause").disabled =
    busy || !run.clockStarted || gameOutcome() !== "playing";
  $("boardViewport").classList.toggle("paused-board", timed && paused);
  $("board").inert = timed && paused;
}
function tone(kind = "move") {
  if (!sound) return;
  try {
    audio ||= new AudioContext();
    void audio.resume();
    const notes = {
      select: [420],
      move: [570],
      reveal: [660, 880],
      done: [523, 659, 784],
      win: [523, 659, 784, 1047],
    }[kind] || [570];
    notes.forEach((frequency, index) => {
      const at = audio.currentTime + index * 0.075;
      const osc = audio.createOscillator(),
        gain = audio.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, at);
      gain.gain.setValueAtTime(0.001, at);
      gain.gain.linearRampToValueAtTime(0.045, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.16);
      osc.connect(gain).connect(audio.destination);
      osc.start(at);
      osc.stop(at + 0.18);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    });
  } catch {
    /* Sound is optional. */
  }
}
function render() {
  boardDrag?.cancel();
  const cfg = levelConfig(mode, round);
  const board = $("board");
  board.replaceChildren();
  board.style.setProperty("--columns", state.tubes.length);
  board.style.setProperty("--capacity", state.capacity);
  board.style.setProperty("--board-min", `${state.tubes.length * 49 - 7}px`);
  $("dimensions").textContent =
    `${state.tubes.length}열 × ${state.capacity}칸 · ${cfg.colors}종`;
  $("stageDescription").textContent =
    cfg.hidden && cfg.hiddenDepth > 0
      ? `물음표 최대 ${cfg.hiddenDepth}단 · 한 칸을 같은 수호동물로 채워 주세요.`
      : "모든 그림을 보면서 같은 수호동물끼리 모아 보세요.";
  const summary = $("ruleSummary");
  const summaryIcon = rules.goalColor !== null
    ? "goal"
    : rules.marked.length
      ? "marked"
      : rules.sealedLane !== null
        ? ruleProgress.sealOpened ? "unlocked" : "sealed"
        : null;
  summary.replaceChildren();
  if (summaryIcon) summary.append(specialArt(summaryIcon));
  const summaryText = document.createElement("span");
  summaryText.textContent = ruleSummary(rules, ruleProgress, stagePets());
  summary.append(summaryText);
  updateStageButtons();
  document.querySelectorAll(".guardian-card").forEach((card, index) => {
    card.classList.toggle("inactive", !cfg.petIds.includes(index));
    card.querySelector("small").textContent = cfg.petIds.includes(index)
      ? "이번 판 등장"
      : "다음 난이도";
  });
  let complete = 0;
  state.tubes.forEach((tube, i) => {
    const done =
      tube.length > 0 &&
      isTubeDone(tube, state.capacity) &&
      !state.hidden[i].some(Boolean);
    if (done) complete++;
    const ruleView = laneRuleView(i, rules, ruleProgress, stagePets());
    const target = selected !== null &&
      canRuleMove(state, selected, i, rules, ruleProgress).allowed;
    const lane = document.createElement("button");
    lane.type = "button";
    lane.className = `lane ${ruleView.classes.join(" ")}${selected === i ? " selected" : ""}${target ? " target" : ""}${done ? " done" : ""}${lastMove?.completed && lastMove.to === i ? " just-completed" : ""}`;
    lane.dataset.lane = i;
    const name = tube.length ? petFor(topColor(tube))[1] : "빈 칸";
    lane.setAttribute(
      "aria-label",
      `${i + 1}번 칸, ${name}, ${tube.length}/${state.capacity}, ${ruleView.label}${done ? ", 완성" : ""}${target ? ", 이동 가능" : ""}`,
    );
    lane.disabled = ruleView.locked;
    lane.setAttribute("aria-pressed", selected === i);
    const number = document.createElement("span");
    number.className = "lane-number";
    number.textContent = done ? "" : String(i + 1);
    const ruleIcons = document.createElement("span");
    ruleIcons.className = "lane-rule-icons";
    if (done) ruleIcons.append(specialArt("sparkle"));
    if (ruleView.markedColor !== null) ruleIcons.append(specialArt("marked"));
    if (rules.sealedLane === i)
      ruleIcons.append(specialArt(ruleProgress.sealOpened ? "unlocked" : "sealed"));
    if (selected === i) ruleIcons.append(specialArt("selection"));
    number.append(ruleIcons);
    const rail = document.createElement("span");
    rail.className = "rail";
    rail.setAttribute("aria-hidden", "true");
    for (let p = tube.length - 1; p >= 0; p--) {
      const hidden = state.hidden[i][p];
      const tile = document.createElement("span");
      tile.className = `tile${hidden ? " hidden" : ""}${lastMove?.to === i && p === tube.length - 1 ? " arrived" : ""}${lastMove?.reveal && lastMove.from === i && p === tube.length - 1 ? " revealed" : ""}`;
      if (p === tube.length - 1 && !hidden) tile.classList.add("draggable-tile");
      // Never leak face-down identities into DOM text, titles, styles or attributes.
      if (hidden) tile.append(specialArt("question"));
      else {
        tile.style.setProperty("--pet-color", petFor(tube[p])[2]);
        const face = document.createElement("span");
        face.className = "tile-face";
        face.append(petArt(cfg.petIds[tube[p]]));
        tile.append(face);
        if (tile.classList.contains("revealed")) {
          const back = document.createElement("span");
          back.className = "tile-back";
          back.append(specialArt("question"));
          tile.append(back);
        }
      }
      rail.append(tile);
    }
    if (!tube.length) {
      const empty = document.createElement("span");
      empty.className = "empty-label";
      empty.append(specialArt("empty"));
      rail.append(empty);
    }
    const hint = document.createElement("span");
    hint.className = "lane-hint";
    hint.textContent = done
      ? "완성"
      : target
        ? "여기로 ↓"
        : `${tube.length}/${state.capacity}`;
    lane.append(number, rail, hint);
    lane.addEventListener("click", () => pick(i));
    board.append(lane);
  });
  $("complete").textContent = `${complete} / ${cfg.colors}`;
  $("moves").textContent = moves;
  $("level").textContent =
    `${cfg.tier}단계 · ${cfg.name}${round > STAGES.length ? ` · ${round - STAGES.length + 1}번째 도전` : ""}`;
  $("mode").value = mode;
  $("modeName").textContent =
    mode === "blind" ? "수호대 여정" : "모두 공개 · 연습";
  document.querySelector(".game-heading p").textContent =
    mode === "blind"
      ? "열두 수호동물과 고양이·병아리의 긴 보드 도전."
      : "물음표 없이 차근차근 연습해 보세요.";
  const result = gameOutcome();
  $("challenge").value = run.rule;
  $("challenge").disabled = mode === "practice" || busy;
  syncClock();
  $("gameStatus").textContent =
    result === "won"
      ? "클리어"
      : result === "playing"
        ? "게임오버 기준 보기"
        : "게임오버 · 구조하기";
  $("gameStatus").classList.toggle(
    "warning",
    ["moves", "blocked", "time"].includes(result),
  );
  $("undo").querySelector("small").textContent =
    mode === "practice" ? "연습 · 무제한" : `${run.undo}개 남음`;
  $("peek").querySelector("small").textContent =
    mode === "practice" ? "연습 · 무제한" : `${run.peek}개 남음`;
  $("undo").disabled =
    !history.length || result === "won" || (mode !== "practice" && !run.undo);
  $("peek").disabled =
    result !== "playing" ||
    !state.hidden.some((h) => h.some(Boolean)) ||
    (mode !== "practice" && !run.peek);
  $("extra").disabled = extra || isWin(state);
  $("extra").querySelector("small").textContent = extra
    ? "이번 판 사용 완료"
    : "1개 남음";
  $("sound").setAttribute("aria-pressed", sound);
  $("sound").setAttribute("aria-label", sound ? "소리 끄기" : "소리 켜기");
  updateScrollHint();
}
function updateScrollHint() {
  document.querySelector(".board-note").textContent =
    $("board").scrollWidth > $("boardViewport").clientWidth
      ? "좌우로 밀어 더 보기 ↔"
      : "십이지신 정렬 퍼즐";
}
function remember() {
  history.push(makeMoveSnapshot({ state, moves, extra, ruleProgress }));
  if (history.length > 100) history.shift();
}
async function pick(i, origin) {
  if (busy) return;
  settleClock();
  if (paused) {
    tell("계속하기를 누르면 타이머와 게임이 다시 시작돼요.");
    return;
  }
  lastMove = null;
  if (["moves", "blocked", "time"].includes(gameOutcome())) {
    showLoss();
    return;
  }
  if (isWin(state)) {
    showWin();
    return;
  }
  if (selected === i) {
    selected = null;
    render();
    focusLane(i);
    tell("선택을 취소했어요. 다른 동물을 골라 주세요.");
    return;
  }
  if (selected === null) {
    if (laneRuleView(i, rules, ruleProgress, stagePets()).locked) {
      tell("봉인된 열은 해제 동물을 먼저 완성해야 사용할 수 있어요.", true);
      return;
    }
    if (!state.tubes[i].length) {
      tell("먼저 옮길 동물이 있는 칸을 선택해 주세요.");
      syncClock();
      return;
    }
    selected = i;
    tone("select");
    render();
    focusLane(i);
    tell(
      `${i + 1}번 칸의 ${petFor(topColor(state.tubes[i]))[1]} 선택! 공간이 남은 열로 옮겨 주세요. 다른 동물 위에도 놓을 수 있어요.`,
    );
    return;
  }
  const permission = canRuleMove(state, selected, i, rules, ruleProgress);
  if (!permission.allowed) {
    nudge($("board").querySelector(`[data-lane="${i}"] .rail`));
    tell(
      permission.reason === "sealed"
        ? "봉인된 열은 해제 동물을 먼저 완성해야 사용할 수 있어요."
        : permission.reason === "marked-color"
          ? "표식 열에는 표시된 동물만 넣을 수 있어요."
          : permission.reason === "goal-first"
            ? "수호 목표 동물을 먼저 완성해 주세요."
            : state.tubes[i].length >= state.capacity
        ? "그 칸은 가득 찼어요. 초록색 칸을 골라 주세요."
        : "맨 위 동물을 선택한 뒤 공간이 남은 다른 열로 옮겨 주세요.",
      true,
    );
    syncClock();
    return;
  }
  remember();
  const from = selected;
  const source = $("board").querySelector(`[data-lane="${from}"] .tile`);
  const targetRail = $("board").querySelector(`[data-lane="${i}"] .rail`);
  const reveal = state.hidden[from][state.tubes[from].length - 2] === true;
  const applied = applyRuleMove(state, from, i, rules, ruleProgress);
  if (!applied) return;
  state = applied.state;
  ruleProgress = applied.progress;
  moves++;
  audit.push({ type: "move", from, to: i });
  if (run.rule === "timed" && mode !== "practice") run.clockStarted = true;
  selected = null;
  const completed = applied.completedColor !== null;
  lastMove = { from, to: i, reveal, completed };
  setBusy(true);
  tone("move");
  save();
  try {
    await flyTile(source, targetRail, origin);
  } finally {
    setBusy(false);
    render();
  }
  focusLane(i);
  if (isWin(state)) {
    tone("win");
    showWin();
    return;
  }
  if (completed) tone("done");
  else if (reveal) tone("reveal");
  if (["moves", "blocked", "time"].includes(gameOutcome())) {
    showLoss();
    return;
  }
  tell(
    completed
      ? `${i + 1}번 칸 완성! ${petFor(topColor(state.tubes[i]))[1]} 친구들을 모두 모았어요.`
      : reveal
        ? `${from + 1}번 칸에 숨어 있던 ${petFor(topColor(state.tubes[from]))[1]} 등장!`
        : `${from + 1}번 → ${i + 1}번으로 이동했어요.`,
  );
}
function start(
  nextMode = mode,
  nextSeed = seed,
  nextRound = round,
  nextRule = run?.rule || "moves",
) {
  clockStamp = null;
  paused = false;
  timeLossShown = false;
  const requestedRound = progression.canAccess(nextRound) ? nextRound : progression.unlocked;
  const generated = startGeneratedLevel(
    { mode, seed, round, state, rules, ruleProgress },
    { mode: nextMode, seed: nextSeed, round: requestedRound, rule: nextRule },
    generateLevel,
  );
  if (!generated.ok) {
    tell("검증된 배치를 만들지 못했어요. 다른 배치로 다시 시도해 주세요.", true);
    modal(
      "배치를 만들지 못했어요",
      "<p>완주 가능 여부를 확인한 배치만 제공해요. 현재 판은 그대로 유지했습니다.</p>",
      "다른 배치 만들기",
      () => {
        $("dialog").close();
        start(nextMode, newSeed(), requestedRound, nextRule);
      },
      "안전한 보드 생성",
    );
    return false;
  }
  ({ mode, seed, round, state, rules, ruleProgress } = generated.next);
  run = createRun(generated.next.level, nextRule, round);
  attemptId = newAttemptId();
  history = [];
  audit = [];
  moves = 0;
  extra = false;
  selected = null;
  lastMove = null;
  render();
  $("boardViewport").scrollLeft = 0;
  save();
  tell(
    mode === "practice"
      ? "연습은 이동 제한 없이 즐겨요."
      : run.rule === "timed"
        ? `타임어택 ${formatTime(run.timeLimitMs)}! 첫 이동부터 시작하고 이동 횟수는 무제한이에요.`
        : `이번 판은 ${run.limit}수 안에 완성하세요. 이동할 곳이 없어져도 게임오버예요.`,
  );
  return true;
}
function modal(
  title,
  body,
  actionLabel = "알겠어요!",
  action = () => $("dialog").close(),
  kicker = "놀이 방법",
) {
  settleClock();
  tutorialView.cancel();
  $("dialog").classList.remove("tutorial-dialog");
  $("dialogTitle").textContent = title;
  $("dialogBody").innerHTML = body;
  $("dialogKicker").textContent = kicker;
  $("dialogAction").textContent = actionLabel;
  $("dialogOptions").replaceChildren();
  dialogAction = action;
  if (!$("dialog").open) $("dialog").showModal();
}
function confirmRestart(action) {
  if (busy) return;
  if (
    !moves &&
    !extra &&
    run.undo === 3 &&
    run.peek === 2 &&
    !run.revived &&
    !run.rewards.undo &&
    !run.rewards.peek
  ) {
    action();
    return;
  }
  modal(
    "현재 판을 끝낼까요?",
    "<p>지금 진행 중인 판은 저장되지 않고 새로 시작해요. 닫기를 누르면 계속할 수 있어요.</p>",
    "새로 시작하기",
    () => {
      $("dialog").close();
      action();
    },
    "다시 시작",
  );
}
function showWin() {
  settleClock();
  if (!isWin(state)) return;
  const record = currentRecord();
  if (mode === "practice" || record) progression.complete(round, state);
  updateStageButtons();
  let rankMessage = "연습 모드 기록은 순위에 등록하지 않아요.";
  if (record) {
    save(); // Persist the attempt ID before inserting; reopening a win is idempotent.
    const stored = leaderboard.submit(record);
    const ranked = rankRecords(leaderboard.records, {
      stage: record.stage,
      rule: record.rule,
      assisted: record.assisted,
      seed: record.seed,
    });
    const entry = ranked.find((r) => r.id === record.id);
    rankMessage = stored
      ? `이 기기 · 같은 배치 ${entry.rank}위 / ${ranked.length}개 기록 · ${scoreLabel(entry)} · ${entry.assisted ? "아이템 사용" : "아이템 없이"}`
      : "저장 공간 문제로 기록은 이번 실행에서만 유지돼요.";
  }
  tell("모든 친구를 모았어요! 다음 판에 도전해 보세요.");
  modal(
    "모두 제자리를 찾았어요!",
    `<p>총 ${moves}번 이동해 ${levelConfig(mode, round).colors}종류의 수호동물을 모았어요.</p><p>${round < STAGES.length ? `다음은 ${levelConfig(mode, round + 1).name}! ${stageColumns(levelConfig(mode, round + 1))}열 × ${levelConfig(mode, round + 1).capacity}칸으로 보드가 커져요.` : "최고 난도에 도달했어요. 같은 크기의 새로운 배치에 도전해 보세요."}</p>`,
    round < STAGES.length ? "다음 단계로" : "새로운 최고 난도 도전",
    () => {
      $("dialog").close();
      start(mode, newSeed(), round + 1);
    },
    "수호 성공",
  );
  celebrate($("dialog"));
  const rankNote = document.createElement("p");
  rankNote.className = "rank-best";
  rankNote.textContent = rankMessage;
  $("dialogBody").append(rankNote);
  if (progression.storageError) {
    const warning = document.createElement("p");
    warning.textContent = "단계 해제 기록을 저장하지 못했어요. 이번 실행에서는 계속할 수 있지만 앱을 닫으면 다시 잠길 수 있어요.";
    $("dialogBody").append(warning);
  }
  option("이번 기록 순위 보기", showRankings);
  option("같은 배치 기록에 재도전", () => {
    $("dialog").close();
    start();
  });
}
function currentRecord() {
  return makeRecord({
    id: attemptId,
    name: leaderboard.name,
    mode,
    seed,
    round,
    state,
    moves,
    extra,
    run,
    rules,
    ruleProgress,
    audit,
  });
}
function showRankings() {
  if (busy) return;
  modal("이 기기 순위", "", "게임으로 돌아가기", undefined, "나의 클리어 기록");
  const record = currentRecord();
  renderLeaderboard($("dialogBody"), leaderboard, {
    stage: levelConfig(mode, round).tier,
    rule: run.rule,
    seed,
    assisted: record?.assisted || false,
    id: attemptId,
  });
}
$("rankings").addEventListener("click", showRankings);
function option(label, action) {
  const button = document.createElement("button");
  button.className = "secondary";
  button.textContent = label;
  button.addEventListener("click", action);
  $("dialogOptions").append(button);
}
function showRules() {
  modal(
    "끝까지 생각해서, 한 수씩",
    `<p>${mode === "practice" ? "연습은 시간·횟수 제한이 없어요." : run.rule === "timed" ? `타임어택은 <b>${formatTime(run.timeLimitMs)}</b> 안에 완성하세요. 이동 횟수는 무제한이에요.` : `이동 제한은 <b>${run.limit}수</b> 안에 완성하세요. 시간제한은 없어요.`}</p><p><b>${ruleSummary(rules, ruleProgress, stagePets())}</b></p><ul><li>선택한 제한이 0이 되거나, 가능한 이동이 0개가 되면 게임오버.</li><li>타이머는 첫 이동부터 시작하고 도움말·일시정지·앱 전환 중 멈춰요. 다시 열면 계속하기를 누르세요.</li><li>마지막 수로 완성하면 성공! 선택·잘못 누르기는 이동 수를 쓰지 않아요.</li><li>되돌리기 3개 · 한 열 공개 2개 · 보조 칸 1개. 되돌리기는 이동 1회만 돌려주며 시간은 돌려주지 않아요.</li><li>공개·보조 칸 사용은 이전 되돌리기 기록을 초기화해요. 다시 하기는 언제나 가능해요.</li></ul>`,
    "알겠어요!",
    undefined,
    "게임오버 & 아이템",
  );
}
function showLoss() {
  settleClock();
  const result = gameOutcome();
  if (!["moves", "blocked", "time"].includes(result)) return;
  if (result === "time") timeLossShown = true;
  selected = null;
  tell(
    result === "time"
      ? "시간이 다 됐어요. 아이템을 확인하거나 다시 도전해 주세요."
      : result === "moves"
        ? "이동 횟수를 모두 썼어요. 남은 아이템을 확인하거나 다시 도전해 주세요."
        : "더 이상 옮길 곳이 없어요. 아이템으로 길을 열어 보세요.",
    true,
  );
  modal(
    result === "time" ? "시간이 다 됐어요" : "잠깐, 길이 막혔어요",
    `<p>${result === "time" ? "남은 시간이 0:00이 되었어요. 되돌리기·보조 칸으로 시간은 늘어나지 않아요." : result === "moves" ? `제한 ${run.limit}수를 모두 사용했어요.` : "옮길 수 있는 동물이나 공간이 남은 다른 열이 없어요."}</p><p>남은 되돌리기 ${run.undo}개${extra ? "" : " · 보조 칸 1개"}. ${result === "moves" ? "보조 칸만 열어서는 이동 횟수가 늘어나지 않아요." : ""}</p>`,
    "다시 하기",
    () => {
      $("dialog").close();
      start();
    },
    "게임오버",
  );
  if (canReturnToItemsAfterLoss(result, {
    historyLength: history.length,
    undo: run.undo,
    extra,
  }))
    option("남은 아이템 사용하러 돌아가기", () => $("dialog").close());
}
function newSeed() {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}
function focusLane(i) {
  $("board")
    .querySelector(`[data-lane="${i}"]`)
    ?.focus({ preventScroll: true });
}
$("undo").addEventListener("click", () => {
  if (busy || !history.length || isWin(state)) return;
  settleClock();
  if (gameOutcome() === "time") {
    render();
    showLoss();
    return;
  }
  const next = consumeItem(run, "undo", mode);
  if (!next) return;
  run = next;
  ({ state, moves, extra, ruleProgress } = restoreMoveSnapshot(history.pop()));
  audit.push({ type: "undo" });
  selected = null;
  lastMove = null;
  render();
  save();
  tell("마지막 한 수를 되돌렸어요.");
});
$("extra").addEventListener("click", () => {
  if (busy || extra || isWin(state)) return;
  settleClock();
  if (gameOutcome() === "time") {
    render();
    showLoss();
    return;
  }
  history = []; // Item effects cannot be refunded by undoing a move.
  state = cloneState(state);
  state.tubes.push([]);
  state.hidden.push([]);
  extra = true;
  audit.push({ type: "extra" });
  selected = null;
  lastMove = null;
  render();
  save();
  tell("보조 칸을 열었어요. 아이템 사용 전의 되돌리기 기록은 초기화돼요.");
  if (gameOutcome() === "moves") showLoss();
});
$("restart").addEventListener("click", () => confirmRestart(() => start()));
$("gameStatus").addEventListener("click", () => {
  const result = gameOutcome();
  if (result === "won") showWin();
  else if (result === "playing") showRules();
  else showLoss();
});
$("peek").addEventListener("click", () => {
  settleClock();
  syncClock();
  if (busy || gameOutcome() !== "playing") return;
  if (selected === null) {
    tell("먼저 물음표가 있는 열을 선택한 뒤 한 열 공개를 눌러 주세요.");
    return;
  }
  const lane = selected;
  const nextState = revealLane(state, lane);
  if (nextState === state) {
    tell("이 열은 이미 모두 공개됐어요. 아이템은 쓰지 않았어요.");
    return;
  }
  const next = consumeItem(run, "peek", mode);
  if (!next) return;
  run = next;
  state = revealCompleted(nextState);
  audit.push({ type: "peek", lane });
  history = [];
  selected = null;
  lastMove = null;
  render();
  save();
  tell(
    "선택한 열의 물음표를 모두 공개했어요. 이전 되돌리기 기록은 초기화돼요.",
  );
  if (isWin(state)) showWin();
});
$("newGame").addEventListener("click", () =>
  confirmRestart(() => start(mode, newSeed())),
);
$("mode").addEventListener("change", (event) => {
  const value = event.target.value;
  event.target.value = mode;
  confirmRestart(() => start(value, newSeed(), round));
});
$("challenge").addEventListener("change", (event) => {
  const rule = event.target.value;
  event.target.value = run.rule;
  confirmRestart(() => start(mode, seed, round, rule));
});
$("pause").addEventListener("click", () => {
  if (busy) return;
  settleClock();
  paused = !paused;
  selected = null;
  render();
  save();
  if (gameOutcome() === "time") showLoss();
  else
    tell(
      paused
        ? "일시정지했어요. 계속하기를 누르면 재개돼요."
        : "타임어택을 계속해요!",
    );
});
$("dialog").addEventListener("close", () => {
  tutorialView.cancel();
  $("dialog").classList.remove("tutorial-dialog");
  syncClock();
});
document.addEventListener("visibilitychange", () => {
  settleClock();
  if (document.hidden && run.rule === "timed" && run.clockStarted) {
    paused = true;
    selected = null;
  }
  syncClock();
  save();
});
window.addEventListener("pagehide", () => {
  settleClock();
  save();
});
$("sound").addEventListener("click", () => {
  sound = !sound;
  $("sound").setAttribute("aria-pressed", sound);
  $("sound").setAttribute("aria-label", sound ? "소리 끄기" : "소리 켜기");
  try {
    localStorage.setItem("pet-sort-sound", sound ? "on" : "off");
  } catch {
    /* Optional preference. */
  }
  tone();
});
$("help").addEventListener("click", () => {
  modal(
    "같은 친구를 모아 주세요",
    `<ol><li><b>맨 위 동물을 잡아 다른 열로 끌어 놓으세요.</b> 출발 열·도착 열을 차례로 눌러도 돼요. 공간이 남으면 다른 동물 위에도 놓을 수 있어요.</li><li>끌고 있는 동안 화면 가장자리에서 자동으로 스크롤돼요. 나머지 동물이나 열의 빈 부분은 밀어서 보드를 스크롤할 수 있어요. 바깥이나 가득 찬 열에 놓으면 이동 수를 쓰지 않아요.</li><li>동물이 있는 모든 열을 같은 동물로 가득 채우면 완성! 빈 열은 남겨도 돼요.</li><li>수호 목표는 표시된 동물을 먼저 완성하고, 표식 열에는 지정 동물만 넣을 수 있어요. 봉인 열은 해제 동물을 완성하면 열려요.</li><li>이동 제한은 남은 수가 0, 타임어택은 남은 시간이 0이면 게임오버. 두 제한을 동시에 걸지는 않아요.</li><li>옮길 곳이 없어져도 게임오버. 타이머는 첫 이동부터 시작하며 도움말·앱 전환 중 멈춰요.</li><li>되돌리기 3개 · 한 열 공개 2개 · 보조 칸 1개. 되돌려도 시간은 복구되지 않아요.</li></ol><p class="rule-note">현재 단계: ${ruleSummary(rules, ruleProgress, stagePets())}</p>`,
  );
  option("작은 판으로 이동 연습", showTutorial);
});
$("dialogAction").addEventListener("click", () => dialogAction());
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("dialog").open && !busy) {
    selected = null;
    lastMove = null;
    render();
    tell("선택을 취소했어요.");
  }
});
for (let chapter = 0; chapter < 5; chapter++) {
  const startStage = chapter * 4 + 1;
  const endStage = startStage + 3;
  const group = document.createElement("details");
  group.className = "stage-chapter";
  group.dataset.start = startStage;
  group.dataset.end = endStage;
  const summary = document.createElement("summary");
  summary.textContent = `${chapter + 1}장 · ${STAGES[startStage - 1].name}–${STAGES[endStage - 1].name}`;
  const buttons = document.createElement("div");
  buttons.className = "stage-chapter-buttons";
  group.append(summary, buttons);
  for (let index = startStage - 1; index < endStage; index++) {
    const stage = STAGES[index];
    const button = document.createElement("button");
    button.className = "stage-button";
    button.type = "button";
    button.innerHTML = `<span>${index + 1} ${stage.name}</span><small>${stageColumns(stage)}열 × ${stage.capacity}칸</small>`;
    button.setAttribute(
      "aria-label",
      `${index + 1}단계 ${stage.name}, ${stageColumns(stage)}열 ${stage.capacity}칸`,
    );
    button.addEventListener("click", () => {
      if (!progression.canAccess(index + 1)) return;
      confirmRestart(() => start(mode, newSeed(), index + 1));
    });
    buttons.append(button);
  }
  $("stages").append(group);
}
PETS.forEach((pet, index) => {
  const card = document.createElement("div");
  card.className = "guardian-card";
  const name = document.createElement("strong");
  name.textContent = pet[1];
  const label = document.createElement("small");
  card.append(petArt(index), name, label);
  $("guardianList").append(card);
});
document.querySelector(".brand-icon").replaceChildren(petArt(2));
document
  .querySelector(".mini-pets")
  .replaceChildren(petArt(0), petArt(2), petArt(3));
document.querySelector(".dialog-pet").replaceChildren(petArt(2));
boardDrag = attachTileDrag($("board"), $("boardViewport"), {
  canStart(from) {
    settleClock();
    return !busy && !paused && !$("dialog").open &&
      gameOutcome() === "playing" &&
      state.tubes[from]?.length > 0 &&
      !laneRuleView(from, rules, ruleProgress, stagePets()).locked;
  },
  canDrop: (from, to) => canRuleMove(state, from, to, rules, ruleProgress).allowed,
  drop(from, to, origin) {
    selected = from;
    void pick(to, origin);
  },
});
new ResizeObserver(updateScrollHint).observe($("boardViewport"));
if (!restore()) {
  start();
} else {
  render();
  tell("이어서 플레이해요. 지난 진행 상황을 불러왔어요.");
  if (isWin(state)) showWin();
  else if (gameOutcome() !== "playing") showLoss();
  save();
}
if (!tutorial.completed && !$("dialog").open) showTutorial();
let lastClockSave = performance.now();
setInterval(() => {
  syncClock();
  if (
    gameOutcome() === "time" &&
    !timeLossShown &&
    !busy &&
    !$("dialog").open
  ) {
    render();
    showLoss();
    save();
  }
  if (clockStamp !== null && performance.now() - lastClockSave >= 1000) {
    save();
    lastClockSave = performance.now();
  }
}, 250);
