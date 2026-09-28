// Presentation only: no board state or game rules live here.
export const reducedMotion = () =>
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

export function flightPath(start, end) {
  const dx = end.left - start.left,
    dy = end.top - start.top;
  const lift = Math.min(80, 28 + Math.abs(dx) * 0.12);
  return [
    { transform: "translate(0, 0) scale(1)", offset: 0 },
    {
      transform: `translate(${dx * 0.48}px, ${Math.min(0, dy) - lift}px) scale(1.12)`,
      offset: 0.48,
    },
    { transform: `translate(${dx}px, ${dy}px) scale(1)`, offset: 1 },
  ];
}

export async function flyTile(source, targetRail, origin) {
  if (!source || !targetRail || reducedMotion() || !source.animate) return;
  const start = origin || source.getBoundingClientRect();
  const rail = targetRail.getBoundingClientRect();
  const top = targetRail.querySelector(".tile");
  const css = getComputedStyle(targetRail);
  const end = {
    left:
      rail.left + parseFloat(css.borderLeftWidth) + parseFloat(css.paddingLeft),
    top: top
      ? top.getBoundingClientRect().top - start.height - parseFloat(css.rowGap)
      : rail.bottom -
        parseFloat(css.borderBottomWidth) -
        parseFloat(css.paddingBottom) -
        start.height,
  };
  const ghost = source.cloneNode(true);
  ghost.className = "tile flying-tile";
  ghost.setAttribute("aria-hidden", "true");
  Object.assign(ghost.style, {
    left: `${start.left}px`,
    top: `${start.top}px`,
    width: `${start.width}px`,
    height: `${start.height}px`,
    minHeight: `${start.height}px`,
  });
  (source.closest?.("dialog[open]") || document.body).append(ghost);
  source.style.visibility = "hidden";
  try {
    await ghost.animate(flightPath(start, end), {
      duration: origin ? 140 : 280,
      easing: "cubic-bezier(.25,.7,.35,1)",
      fill: "forwards",
    }).finished;
  } catch {
    // Cancellation (navigation / reduced-motion preference change) must not lock play.
  } finally {
    ghost.remove();
    source.style.visibility = "";
  }
}

export function nudge(element) {
  if (!element?.animate || reducedMotion()) {
    element?.classList?.remove("invalid-target");
    return;
  }
  element.classList?.add("invalid-target");
  const animation = element.animate(
    [
      { transform: "translateX(0)" },
      { transform: "translateX(-4px)" },
      { transform: "translateX(4px)" },
      { transform: "translateX(0)" },
    ],
    { duration: 180, easing: "steps(2, end)" },
  );
  const clearState = () => element.classList?.remove("invalid-target");
  animation.finished?.then(clearState, clearState);
  return animation;
}

export function celebrate(host) {
  host.querySelector(".celebration")?.remove();
  if (reducedMotion()) return;
  const burst = document.createElement("span");
  burst.className = "celebration";
  burst.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 18; i++) {
    const piece = document.createElement("i");
    piece.style.setProperty("--x", `${(i % 9) * 12.5}%`);
    piece.style.setProperty("--delay", `${(i % 5) * 35}ms`);
    piece.style.setProperty("--turn", `${i % 2 ? 260 : -230}deg`);
    piece.style.background = ["#e6abbd", "#efc769", "#a4c595", "#b6aad7"][
      i % 4
    ];
    burst.append(piece);
  }
  host.append(burst);
  setTimeout(() => burst.remove(), 1600);
}
