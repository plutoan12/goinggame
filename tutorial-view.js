import { attachTileDrag } from "./drag.js";
import { flyTile, celebrate } from "./motion.js";

const instructions = [
  "① 1번 열 맨 위 병아리를 잡아 3번 빈 열에 놓아 주세요.",
  "② 2번 열 맨 위 고양이를 1번 열로 옮겨요. 고양이 한 열이 완성돼요!",
  "③ 3번 열의 병아리를 2번 열로 옮기면 모두 완성이에요.",
];

// Reused for replays, so drag listeners are attached only once per page.
export function createTutorialView(tutorial, { petArt, onComplete }) {
  const root = document.createElement("section");
  root.className = "tutorial";
  const instruction = document.createElement("p");
  instruction.className = "tutorial-instruction";
  instruction.setAttribute("role", "status");
  instruction.setAttribute("aria-live", "polite");
  const viewport = document.createElement("div");
  viewport.className = "tutorial-viewport";
  const board = document.createElement("div");
  board.className = "board tutorial-board";
  board.setAttribute("aria-label", "튜토리얼 4열 3칸 게임판");
  viewport.append(board);
  const note = document.createElement("p");
  note.className = "tutorial-note";
  note.textContent = "끌어서 이동하거나 출발·도착 열을 차례로 눌러요. 시간·횟수 제한은 없어요. 본게임에서는 공간이 있는 다른 동물 위에도 놓을 수 있어요.";
  root.append(instruction, viewport, note);
  let selected = null, busy = false, generation = 0;
  const drag = attachTileDrag(board, viewport, {
    canStart: (from) => !busy && tutorial.guide?.from === from,
    canDrop: (from, to) => !busy && tutorial.canMove(from, to),
    drop: (from, to, origin) => void move(from, to, origin),
  });

  async function move(from, to, origin) {
    if (busy || !tutorial.canMove(from, to)) return;
    const current = generation;
    busy = true;
    board.setAttribute("aria-busy", "true");
    const source = board.querySelector(`[data-lane="${from}"] .tile`);
    const rail = board.querySelector(`[data-lane="${to}"] .rail`);
    await flyTile(source, rail, origin);
    if (current !== generation) return;
    tutorial.move(from, to);
    busy = false;
    selected = null;
    render();
    if (tutorial.done) { celebrate(root); onComplete(); }
    else board.querySelector(`[data-lane="${tutorial.guide.from}"]`).focus({ preventScroll: true });
  }

  function pick(index) {
    if (busy || tutorial.done) return;
    if (selected !== null && tutorial.canMove(selected, index)) {
      void move(selected, index);
    } else if (index === tutorial.guide.from) {
      selected = selected === index ? null : index;
      render();
      board.querySelector(`[data-lane="${index}"]`).focus({ preventScroll: true });
    } else {
      instruction.textContent = `이번에는 ${tutorial.guide.from + 1}번 열에서 ${tutorial.guide.to + 1}번 열로 옮겨 보세요. 잘못 눌러도 괜찮아요.`;
    }
  }

  function render() {
    drag.cancel();
    board.replaceChildren();
    board.setAttribute("aria-busy", "false");
    const state = tutorial.state, guide = tutorial.guide;
    instruction.textContent = tutorial.done
      ? `잘했어요! 같은 동물로 열을 가득 채우면 완성이에요.${tutorial.storageError ? " 완료 기록을 저장하지 못해 다음 실행 때 안내가 다시 나올 수 있어요." : ""}`
      : instructions[tutorial.step];
    state.tubes.forEach((tube, index) => {
      const lane = document.createElement("button");
      lane.type = "button";
      lane.className = `lane${selected === index ? " selected" : ""}${guide?.from === index ? " tutorial-source" : ""}${guide?.to === index ? " tutorial-target" : ""}`;
      lane.dataset.lane = index;
      const top = tube.at(-1);
      lane.setAttribute("aria-label", `연습 ${index + 1}번 열, ${top === undefined ? "빈 칸" : top === 0 ? "고양이" : "병아리"}, ${tube.length}/3${guide?.from === index ? ", 여기서 출발" : guide?.to === index ? ", 여기에 놓기" : ""}`);
      lane.setAttribute("aria-pressed", selected === index);
      const number = document.createElement("span");
      number.className = "lane-number";
      number.textContent = index + 1;
      const rail = document.createElement("span");
      rail.className = "rail";
      rail.setAttribute("aria-hidden", "true");
      [...tube].reverse().forEach((color, position) => {
        const tile = document.createElement("span");
        tile.className = `tile${position === 0 ? " draggable-tile" : ""}`;
        tile.style.setProperty("--pet-color", color === 0 ? "#efc7a5" : "#f5da7b");
        const face = document.createElement("span");
        face.className = "tile-face";
        face.append(petArt(color === 0 ? 12 : 13));
        tile.append(face);
        rail.append(tile);
      });
      if (!tube.length) {
        const empty = document.createElement("span");
        empty.className = "empty-label";
        empty.textContent = "빈 칸";
        rail.append(empty);
      }
      const hint = document.createElement("span");
      hint.className = "lane-hint";
      hint.textContent = guide?.from === index ? "여기서 ↑" : guide?.to === index ? "여기로 ↓" : `${tube.length}/3`;
      lane.append(number, rail, hint);
      lane.addEventListener("click", () => pick(index));
      board.append(lane);
    });
  }
  return {
    root,
    get busy() { return busy; },
    restart() { this.cancel(); selected = null; tutorial.restart(); render(); },
    cancel() { generation++; busy = false; drag.cancel(); },
  };
}
