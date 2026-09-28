import { attachTileDrag } from "./drag.js";
import { flyTile, celebrate } from "./motion.js";

const instructions = [
  "① 1번 열 맨 위 병아리를 보관칸에 잠시 놓아 주세요.",
  "② 2번 열 맨 위 고양이를 1번 열로 옮겨요. 고양이 한 열이 완성돼요!",
  "③ 보관칸의 병아리를 2번 열로 돌려놓으면 모두 완성이에요.",
];
const sameLocation = (left, right) =>
  left?.kind === right?.kind && left?.index === right?.index;
const selectorFor = ({ kind, index }) =>
  `[data-location-kind="${kind}"][data-location-index="${index}"]`;
const locationLabel = (location) => location.kind === "holding"
  ? "보관칸"
  : `${location.index + 1}번 열`;

// Reused for replays, so drag listeners are attached only once per page.
export function createTutorialView(tutorial, { petArt, onComplete }) {
  const root = document.createElement("section");
  root.className = "tutorial";
  const instruction = document.createElement("p");
  instruction.className = "tutorial-instruction";
  instruction.setAttribute("role", "status");
  instruction.setAttribute("aria-live", "polite");
  const surface = document.createElement("div");
  surface.className = "tutorial-play-surface";
  const tray = document.createElement("div");
  tray.className = "holding-tray tutorial-holding-tray";
  tray.setAttribute("aria-label", "튜토리얼 보관칸");
  const trayHeading = document.createElement("span");
  trayHeading.textContent = "보관칸";
  const traySlots = document.createElement("div");
  traySlots.className = "holding-slots";
  const trayCount = document.createElement("span");
  trayCount.className = "holding-count";
  trayCount.setAttribute("aria-live", "polite");
  tray.append(trayHeading, traySlots, trayCount);
  const viewport = document.createElement("div");
  viewport.className = "tutorial-viewport";
  const board = document.createElement("div");
  board.className = "board tutorial-board";
  board.setAttribute("aria-label", "튜토리얼 4열 3칸 게임판");
  viewport.append(board);
  surface.append(tray, viewport);
  const note = document.createElement("p");
  note.className = "tutorial-note";
  note.textContent = "끌어서 이동하거나 출발·도착 칸을 차례로 눌러요. 시간·횟수 제한은 없어요. 본게임에서도 보관칸은 한 마리씩 자유롭게 넣고 꺼낼 수 있어요.";
  root.append(instruction, surface, note);
  let selected = null, busy = false, generation = 0;
  const elementFor = (location) => surface.querySelector(selectorFor(location));
  const drag = attachTileDrag(surface, viewport, {
    canStart: (from) => !busy && sameLocation(tutorial.guide?.from, from),
    canDrop: (from, to) => !busy && tutorial.canMove(from, to),
    drop: (from, to, origin) => void move(from, to, origin),
  });

  async function move(from, to, origin) {
    if (busy || !tutorial.canMove(from, to)) return;
    const current = generation;
    busy = true;
    surface.setAttribute("aria-busy", "true");
    const source = elementFor(from)?.querySelector(".tile");
    const rail = elementFor(to)?.querySelector(".rail");
    await flyTile(source, rail, origin);
    if (current !== generation) return;
    tutorial.move(from, to);
    busy = false;
    selected = null;
    render();
    if (tutorial.done) {
      celebrate(root);
      onComplete();
    } else {
      elementFor(tutorial.guide.from)?.focus({ preventScroll: true });
    }
  }

  function pick(location) {
    if (busy || tutorial.done) return;
    if (selected !== null && tutorial.canMove(selected, location)) {
      void move(selected, location);
    } else if (sameLocation(location, tutorial.guide.from)) {
      selected = sameLocation(selected, location) ? null : location;
      render();
      elementFor(location)?.focus({ preventScroll: true });
    } else {
      instruction.textContent = `이번에는 ${locationLabel(tutorial.guide.from)}에서 ${locationLabel(tutorial.guide.to)}으로 옮겨 보세요. 잘못 눌러도 괜찮아요.`;
    }
  }

  function renderTile(color, draggable = true) {
    const tile = document.createElement("span");
    tile.className = `tile${draggable ? " draggable-tile" : ""}`;
    tile.style.setProperty("--pet-color", color === 0 ? "#efc7a5" : "#f5da7b");
    const face = document.createElement("span");
    face.className = "tile-face";
    face.append(petArt(color === 0 ? 12 : 13));
    tile.append(face);
    return tile;
  }

  function render() {
    drag.cancel();
    board.replaceChildren();
    traySlots.replaceChildren();
    surface.setAttribute("aria-busy", "false");
    const state = tutorial.state, guide = tutorial.guide;
    instruction.textContent = tutorial.done
      ? `잘했어요! 보관칸을 비우고 같은 동물로 열을 가득 채우면 완성이에요.${tutorial.storageError ? " 완료 기록을 저장하지 못해 다음 실행 때 안내가 다시 나올 수 있어요." : ""}`
      : instructions[tutorial.step];
    state.tubes.forEach((tube, index) => {
      const location = { kind: "tube", index };
      const lane = document.createElement("button");
      lane.type = "button";
      lane.className = `lane${sameLocation(selected, location) ? " selected" : ""}${sameLocation(guide?.from, location) ? " tutorial-source" : ""}${sameLocation(guide?.to, location) ? " tutorial-target" : ""}`;
      lane.dataset.locationKind = location.kind;
      lane.dataset.locationIndex = String(location.index);
      const top = tube.at(-1);
      lane.setAttribute("aria-label", `연습 ${index + 1}번 열, ${top === undefined ? "빈 칸" : top === 0 ? "고양이" : "병아리"}, ${tube.length}/3${sameLocation(guide?.from, location) ? ", 여기서 출발" : sameLocation(guide?.to, location) ? ", 여기에 놓기" : ""}`);
      lane.setAttribute("aria-pressed", sameLocation(selected, location));
      const number = document.createElement("span");
      number.className = "lane-number";
      number.textContent = index + 1;
      const rail = document.createElement("span");
      rail.className = "rail";
      rail.setAttribute("aria-hidden", "true");
      [...tube].reverse().forEach((color, position) => {
        rail.append(renderTile(color, position === 0));
      });
      if (!tube.length) {
        const empty = document.createElement("span");
        empty.className = "empty-label";
        empty.textContent = "빈 칸";
        rail.append(empty);
      }
      const hint = document.createElement("span");
      hint.className = "lane-hint";
      hint.textContent = sameLocation(guide?.from, location)
        ? "여기서 ↑"
        : sameLocation(guide?.to, location)
          ? "여기로 ↓"
          : `${tube.length}/3`;
      lane.append(number, rail, hint);
      lane.addEventListener("click", () => pick(location));
      board.append(lane);
    });
    state.holding.forEach((color, index) => {
      const location = { kind: "holding", index };
      const slot = document.createElement("button");
      slot.type = "button";
      slot.className = `holding-slot${color === null ? " holding-empty" : " occupied"}${sameLocation(selected, location) ? " selected" : ""}${sameLocation(guide?.from, location) ? " tutorial-source" : ""}${sameLocation(guide?.to, location) ? " tutorial-target" : ""}`;
      slot.dataset.locationKind = location.kind;
      slot.dataset.locationIndex = String(location.index);
      slot.setAttribute("aria-pressed", sameLocation(selected, location));
      slot.setAttribute("aria-label", `연습 보관칸, ${color === null ? "비어 있음" : color === 0 ? "고양이" : "병아리"}${sameLocation(guide?.from, location) ? ", 여기서 출발" : sameLocation(guide?.to, location) ? ", 여기에 놓기" : ""}`);
      const rail = document.createElement("span");
      rail.className = "rail";
      rail.setAttribute("aria-hidden", "true");
      if (color === null) {
        const empty = document.createElement("span");
        empty.className = "empty-label";
        empty.textContent = "빈 보관칸";
        rail.append(empty);
      } else {
        rail.append(renderTile(color));
      }
      slot.append(rail);
      slot.addEventListener("click", () => pick(location));
      traySlots.append(slot);
    });
    const occupied = state.holding.filter((color) => color !== null).length;
    trayCount.textContent = `${occupied} / ${state.holding.length} 사용`;
  }
  return {
    root,
    get busy() { return busy; },
    restart() { this.cancel(); selected = null; tutorial.restart(); render(); },
    cancel() { generation++; busy = false; drag.cancel(); },
  };
}
