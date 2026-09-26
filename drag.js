// Pointer-based dragging. Rules and state changes stay in the game controller.
export function dragStarted(start, point, threshold = 7) {
  return Math.hypot(point.x - start.x, point.y - start.y) >= threshold;
}
export function edgeSpeed(value, min, max, margin = 44) {
  if (value < min || value > max) return 0;
  if (value < min + margin) return -Math.min(1, (min + margin - value) / margin);
  if (value > max - margin) return Math.min(1, (value - max + margin) / margin);
  return 0;
}

export function attachTileDrag(board, viewport, { canStart, canDrop, drop }) {
  const doc = board.ownerDocument, view = doc.defaultView;
  let gesture = null, frame = null, suppressUntil = 0;
  const point = (event) => ({ x: event.clientX, y: event.clientY });
  const lanes = () => board.querySelectorAll("[data-lane]");
  function highlight() {
    for (const lane of lanes()) {
      const to = Number(lane.dataset.lane);
      lane.classList.toggle("drag-target", !!gesture?.active && canDrop(gesture.from, to));
      lane.classList.toggle("drag-over", !!gesture?.active && gesture.to === to);
    }
  }
  function update() {
    const g = gesture;
    if (!g?.active) return;
    g.ghost.style.left = `${g.point.x - g.offset.x}px`;
    g.ghost.style.top = `${g.point.y - g.offset.y}px`;
    const hit = doc.elementFromPoint(g.point.x, g.point.y)?.closest("[data-lane]");
    const to = hit && board.contains(hit) ? Number(hit.dataset.lane) : null;
    g.to = to !== null && canDrop(g.from, to) ? to : null;
    highlight();
  }
  function scrollFrame(time) {
    frame = null;
    const g = gesture;
    if (!g?.active) return;
    const elapsed = Math.min(32, g.lastFrame === null ? 16 : time - g.lastFrame);
    g.lastFrame = time;
    const rect = viewport.getBoundingClientRect();
    viewport.scrollLeft += edgeSpeed(g.point.x, rect.left, rect.right) * elapsed * 0.55;
    const screen = view.visualViewport;
    const top = screen?.offsetTop || 0;
    const bottom = top + (screen?.height || view.innerHeight);
    if (g.point.x >= rect.left && g.point.x <= rect.right)
      view.scrollBy(0, edgeSpeed(g.point.y, top + 12, bottom - 12) * elapsed * 0.55);
    update();
    frame = view.requestAnimationFrame(scrollFrame);
  }
  function cleanup() {
    const g = gesture;
    if (!g) return null;
    gesture = null;
    if (frame !== null) view.cancelAnimationFrame(frame);
    frame = null;
    g.ghost?.remove();
    g.tile.style.visibility = g.visibility;
    board.classList.remove("dragging");
    highlight();
    if (g.tile.hasPointerCapture?.(g.id)) g.tile.releasePointerCapture(g.id);
    if (g.active) suppressUntil = Date.now() + 500;
    return g;
  }
  function down(event) {
    if (gesture || event.isPrimary === false || event.button !== 0) return;
    const tile = event.target.closest(".draggable-tile");
    const lane = tile?.closest("[data-lane]");
    if (!lane || !board.contains(lane)) return;
    const from = Number(lane.dataset.lane);
    if (!canStart(from)) return;
    const rect = tile.getBoundingClientRect(), start = point(event);
    gesture = {
      id: event.pointerId, from, to: null, tile, rect, start, point: start,
      offset: { x: start.x - rect.left, y: start.y - rect.top },
      visibility: tile.style.visibility, active: false, lastFrame: null,
    };
    // Capture the tile, not the board: a short tap still clicks its original lane.
    tile.setPointerCapture(event.pointerId);
  }
  function move(event) {
    const g = gesture;
    if (!g || g.id !== event.pointerId) return;
    g.point = point(event);
    if (!g.active && dragStarted(g.start, g.point)) {
      if (!canStart(g.from)) { cleanup(); return; }
      g.active = true;
      g.ghost = g.tile.cloneNode(true);
      g.ghost.className = "tile flying-tile drag-ghost";
      g.ghost.setAttribute("aria-hidden", "true");
      Object.assign(g.ghost.style, {
        width: `${g.rect.width}px`, height: `${g.rect.height}px`,
        minHeight: `${g.rect.height}px`, visibility: "visible",
      });
      (g.tile.closest("dialog[open]") || doc.body).append(g.ghost);
      g.tile.style.visibility = "hidden";
      board.classList.add("dragging");
      frame = view.requestAnimationFrame(scrollFrame);
    }
    if (g.active) { event.preventDefault(); update(); }
  }
  function up(event) {
    if (gesture?.id !== event.pointerId) return;
    if (gesture.active) {
      gesture.point = point(event);
      update();
    }
    const origin = gesture.ghost?.getBoundingClientRect();
    const g = cleanup();
    if (g.active) {
      event.preventDefault();
      // Outside/full/self drops cancel without consuming a move or item.
      if (g.to !== null && canStart(g.from) && canDrop(g.from, g.to))
        drop(g.from, g.to, origin);
    }
  }
  function cancel(event) {
    if (!event || gesture?.id === event.pointerId) cleanup();
  }
  function click(event) {
    // Prevent the synthesized post-drag click from selecting/moving a second time.
    // Keyboard/assistive clicks (detail=0) remain available.
    if (event.detail !== 0 && Date.now() < suppressUntil) {
      event.preventDefault(); event.stopImmediatePropagation(); suppressUntil = 0;
    }
  }
  board.addEventListener("pointerdown", down);
  board.addEventListener("pointermove", move, { passive: false });
  board.addEventListener("pointerup", up);
  board.addEventListener("pointercancel", cancel);
  board.addEventListener("lostpointercapture", cancel);
  board.addEventListener("click", click, true);
  view.addEventListener("blur", () => cancel());
  doc.addEventListener("visibilitychange", () => { if (doc.hidden) cancel(); });
  doc.addEventListener("keydown", (event) => { if (event.key === "Escape") cancel(); });
  return { cancel: () => cancel() };
}
