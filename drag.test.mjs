import test from "node:test";
import assert from "node:assert/strict";
import { attachTileDrag, dragStarted, edgeSpeed } from "./drag.js";

function harness(inDialog = false) {
  class Node {
    constructor(kind, lane) {
      this.kind = kind; this.lane = lane; this.dataset = { lane };
      this.listeners = {}; this.style = {}; this.classes = new Set();
      this.classList = {
        add: (c) => this.classes.add(c), remove: (c) => this.classes.delete(c),
        toggle: (c, on) => on ? this.classes.add(c) : this.classes.delete(c),
      };
    }
    addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
    emit(type, data = {}) {
      const event = { pointerId: 1, isPrimary: true, button: 0, clientX: 25, clientY: 30,
        target: tile, detail: 1, prevented: false, stopped: false,
        preventDefault() { this.prevented = true; },
        stopImmediatePropagation() { this.stopped = true; }, ...data };
      for (const handler of this.listeners[type] || []) handler(event);
      return event;
    }
    closest(selector) {
      if (selector === ".draggable-tile") return this.kind === "tile" ? this : null;
      if (selector === "dialog[open]") return inDialog ? dialog : null;
      return this.kind === "tile" ? columns[0] : this.kind === "lane" ? this : null;
    }
    setAttribute() {}
    setPointerCapture(id) { this.capture = id; }
    hasPointerCapture(id) { return this.capture === id; }
    releasePointerCapture() { this.capture = null; }
    cloneNode() { return new Node("ghost"); }
    getBoundingClientRect() {
      return { left: parseFloat(this.style.left) || 10, top: parseFloat(this.style.top) || 10,
        width: 40, height: 40 };
    }
    remove() { this.removed = true; }
  }
  const board = new Node("board"), tile = new Node("tile"),
    columns = [0, 1, 2].map((i) => new Node("lane", String(i))),
    doc = new Node("doc"), view = new Node("view");
  let hit = columns[1], allowed = true, frame, ghost, ghostHost;
  const dialog = { append: (node) => { ghost = node; ghostHost = "dialog"; } };
  const moves = [], scrolls = [];
  const viewport = { scrollLeft: 100, getBoundingClientRect: () => ({ left: 0, right: 300 }) };
  board.ownerDocument = doc;
  board.querySelectorAll = () => columns;
  board.contains = (node) => columns.includes(node);
  doc.defaultView = view;
  doc.elementFromPoint = () => hit;
  doc.body = { append: (node) => { ghost = node; ghostHost = "body"; } };
  view.innerHeight = 700;
  view.scrollBy = (x, y) => scrolls.push([x, y]);
  view.requestAnimationFrame = (callback) => { frame = callback; return 1; };
  view.cancelAnimationFrame = () => { frame = null; };
  const controller = attachTileDrag(board, viewport, {
    canStart: () => allowed,
    canDrop: (from, to) => from !== to && to === 1,
    drop: (...args) => moves.push(args),
  });
  return { board, tile, columns, moves, viewport, scrolls, view, doc, controller,
    setHit: (node) => { hit = node; }, disallow: () => { allowed = false; },
    ghost: () => ghost, ghostHost: () => ghostHost, tick: () => frame?.(16) };
}
test("tutorial drag stays in the modal top layer instead of behind its backdrop", () => {
  for (const inDialog of [true, false]) {
    const h = harness(inDialog);
    h.board.emit("pointerdown");
    h.board.emit("pointermove", { clientX: 100 });
    assert.equal(h.ghostHost(), inDialog ? "dialog" : "body");
    h.controller.cancel();
  }
});
test("drag threshold avoids accidental drags; scrolling edges are bounded", () => {
  assert.equal(dragStarted({ x: 0, y: 0 }, { x: 3, y: 4 }), false);
  assert.equal(dragStarted({ x: 0, y: 0 }, { x: 8, y: 0 }), true);
  assert.equal(edgeSpeed(-1, 0, 300), 0);
  assert.equal(edgeSpeed(150, 0, 300), 0);
  assert.equal(edgeSpeed(0, 0, 300), -1);
  assert.equal(edgeSpeed(300, 0, 300), 1);
});
test("short taps and keyboard clicks remain available", () => {
  const h = harness();
  h.board.emit("pointerdown");
  h.board.emit("pointermove", { clientX: 28 });
  h.board.emit("pointerup");
  assert.equal(h.moves.length, 0);
  assert.equal(h.board.emit("click").prevented, false);
  assert.equal(h.board.emit("click", { detail: 0 }).prevented, false);
});
test("drag follows pointer, highlights destination and commits exactly once on release", () => {
  const h = harness();
  h.board.emit("pointerdown");
  h.board.emit("pointermove", { clientX: 100, clientY: 150 });
  assert.equal(h.ghost().style.left, "85px");
  assert.equal(h.ghost().style.top, "130px");
  assert.equal(h.tile.style.visibility, "hidden");
  assert.ok(h.columns[1].classes.has("drag-over"));
  assert.equal(h.moves.length, 0);
  h.board.emit("pointerup", { clientX: 100, clientY: 150 });
  assert.equal(h.moves.length, 1);
  assert.deepEqual(h.moves[0].slice(0, 2), [0, 1]);
  assert.equal(h.moves[0][2].left, 85);
  assert.equal(h.ghost().removed, true);
  assert.notEqual(h.tile.style.visibility, "hidden");
  assert.equal(h.board.emit("click").stopped, true);
  assert.equal(h.board.emit("click").stopped, false);
});
test("full, source and outside drops cancel without a move", () => {
  for (const to of [0, 2, null]) {
    const h = harness();
    h.board.emit("pointerdown");
    h.board.emit("pointermove", { clientX: 100 });
    h.setHit(to === null ? null : h.columns[to]);
    h.board.emit("pointerup");
    assert.equal(h.moves.length, 0);
    assert.equal(h.ghost().removed, true);
  }
});
test("pointer cancellation, lost capture, render and background clean up", () => {
  for (const reason of ["pointercancel", "lostpointercapture", "render", "blur", "hidden", "escape"]) {
    const h = harness();
    h.board.emit("pointerdown");
    h.board.emit("pointermove", { clientX: 100 });
    if (reason === "render") h.controller.cancel();
    else if (reason === "blur") h.view.emit("blur");
    else if (reason === "hidden") { h.doc.hidden = true; h.doc.emit("visibilitychange"); }
    else if (reason === "escape") h.doc.emit("keydown", { key: "Escape" });
    else h.board.emit(reason);
    h.board.emit("pointerup");
    assert.equal(h.moves.length, 0);
    assert.equal(h.ghost().removed, true);
    assert.equal(h.columns[1].classes.size, 0);
    assert.notEqual(h.tile.style.visibility, "hidden");
  }
});
test("second pointers ignored and expired/paused games cannot commit a drag", () => {
  const h = harness();
  h.board.emit("pointerdown");
  h.board.emit("pointermove", { clientX: 100 });
  h.board.emit("pointerup", { pointerId: 2 });
  assert.equal(h.moves.length, 0);
  assert.equal(h.ghost().removed, undefined);
  h.disallow();
  h.board.emit("pointerup");
  assert.equal(h.moves.length, 0);
});
test("dragging near edges scrolls both axes", () => {
  const h = harness();
  h.board.emit("pointerdown");
  h.board.emit("pointermove", { clientX: 290, clientY: 680 });
  h.tick();
  assert.ok(h.viewport.scrollLeft > 100);
  assert.ok(h.scrolls.some(([, y]) => y > 0));
  h.controller.cancel();
});
