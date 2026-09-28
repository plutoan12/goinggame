import { isWin, topAt } from "./engine.js?v=engine-2";
import { applyRuleTransfer, canRuleTransfer } from "./rules.js";

function sameLocation(left, right) {
  return left?.kind === right?.kind && left?.index === right?.index;
}

export async function pickLocation(context, location, origin) {
  if (context.busy) {
    context.syncClock();
    return;
  }

  // Account to the interaction boundary without creating a polling-sized gap.
  // The final sync covers every synchronous return and post-animation exit.
  context.syncClock();
  try {
    if (context.paused) {
      context.tell("계속하기를 누르면 타이머와 게임이 다시 시작돼요.");
      return;
    }
    context.lastMove = null;
    if (["moves", "blocked", "time"].includes(context.outcome())) {
      context.showLoss();
      return;
    }
    if (isWin(context.state)) {
      context.showWin();
      return;
    }
    if (sameLocation(context.selected, location)) {
      context.selected = null;
      context.render();
      context.focusLocation(location);
      context.tell("선택을 취소했어요. 다른 동물을 골라 주세요.");
      return;
    }
    if (context.selected === null) {
      if (context.locationLocked(location)) {
        context.tell("봉인된 열은 해제 동물을 먼저 완성해야 사용할 수 있어요.", true);
        return;
      }
      const color = topAt(context.state, location);
      if (color === null) {
        context.tell("먼저 옮길 동물이 있는 열이나 보관칸을 선택해 주세요.");
        return;
      }
      context.selected = { ...location };
      context.tone("select");
      context.render();
      context.focusLocation(location);
      context.tell(
        `${context.locationLabel(location)}의 ${context.petName(color)} 선택! 빈 보관칸이나 공간이 남은 열로 옮겨 주세요.`,
      );
      return;
    }
    const permission = canRuleTransfer(
      context.state,
      context.selected,
      location,
      context.rules,
      context.ruleProgress,
    );
    if (!permission.allowed) {
      context.nudgeLocation(location);
      context.tell(
        permission.reason === "sealed"
          ? "봉인된 열은 해제 동물을 먼저 완성해야 사용할 수 있어요."
          : permission.reason === "marked-color"
            ? "표식 열에는 표시된 동물만 넣을 수 있어요."
            : permission.reason === "goal-first"
              ? "수호 목표 동물을 먼저 완성해 주세요."
              : location.kind === "holding" && context.state.holding[location.index] !== null
                ? "그 보관칸은 사용 중이에요. 빈 보관칸을 골라 주세요."
                : location.kind === "tube" && context.state.tubes[location.index].length >= context.state.capacity
                  ? "그 열은 가득 찼어요. 이동 가능한 칸을 골라 주세요."
                  : "맨 위 동물을 선택한 뒤 빈 보관칸이나 공간이 남은 열로 옮겨 주세요.",
        true,
      );
      return;
    }
    const from = { ...context.selected };
    const to = { ...location };
    const applied = applyRuleTransfer(
      context.state,
      from,
      to,
      context.rules,
      context.ruleProgress,
    );
    if (!applied) return;
    context.remember();
    const { source, targetRail } = context.moveElements(from, to);
    const reveal = from.kind === "tube" &&
      context.state.hidden[from.index][context.state.tubes[from.index].length - 2] === true;
    context.state = applied.state;
    context.ruleProgress = applied.progress;
    context.moves++;
    context.audit.push({ type: "move", from, to });
    if (context.run.rule === "timed" && context.mode !== "practice") {
      context.run.clockStarted = true;
    }
    context.selected = null;
    const completed = applied.completedColor !== null;
    context.lastMove = { from, to, reveal, completed };
    context.setBusy(true);
    context.settleClock();
    context.tone("move");
    context.save();
    try {
      await context.flyTile(source, targetRail, origin);
    } finally {
      context.setBusy(false);
      context.syncClock();
      context.render();
    }
    context.focusLocation(to);
    if (isWin(context.state)) {
      context.tone("win");
      context.showWin();
      return;
    }
    if (completed) context.tone("done");
    else if (reveal) context.tone("reveal");
    if (["moves", "blocked", "time"].includes(context.outcome())) {
      context.showLoss();
      return;
    }
    context.tell(
      completed
        ? `${context.locationLabel(to)} 완성! ${context.petName(topAt(context.state, to))} 친구들을 모두 모았어요.`
        : reveal
          ? `${context.locationLabel(from)}에 숨어 있던 ${context.petName(topAt(context.state, from))} 등장!`
          : `${context.locationLabel(from)} → ${context.locationLabel(to)}으로 이동했어요.`,
    );
  } finally {
    context.syncClock();
  }
}
