import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

function declarationsFor(css, selector) {
  const declarations = [];
  const uncommented = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const match of uncommented.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = match[1].split(",").map((part) => part.trim());
    if (selectors.includes(selector)) declarations.push(match[2]);
  }
  return declarations.join("\n");
}

test("build output reset removes stale files before writing a bundle", async () => {
  const helpers = await import("./scripts/reset-dir.mjs").catch(() => ({}));
  assert.equal(typeof helpers.resetDirectory, "function");
  if (typeof helpers.resetDirectory !== "function") return;

  const parent = await mkdtemp(join(tmpdir(), "twelve-puzzle-build-"));
  const output = join(parent, "dist");
  await helpers.resetDirectory(output);
  await writeFile(join(output, "obsolete.png"), "stale");
  await helpers.resetDirectory(output);
  assert.deepEqual(await readdir(output), []);
});

test("shipped styles keep the holding tray fixed above a bounded two-axis board", async () => {
  const [css, build] = await Promise.all([
    readFile("style.css", "utf8"),
    readFile("scripts/build.mjs", "utf8"),
  ]);
  const viewport = declarationsFor(css, ".board-viewport");
  const tray = declarationsFor(css, ".holding-tray");

  assert.match(build, /"style\.css"/);
  assert.match(tray, /position:\s*(?:sticky|relative)/);
  assert.match(tray, /z-index:\s*\d+/);
  assert.match(viewport, /overflow-x:\s*auto/);
  assert.match(viewport, /overflow-y:\s*auto/);
  const fixedFallback = viewport.indexOf("max-height: 720px");
  const vhFallback = viewport.indexOf("max-height: min(68vh, 720px)");
  const dynamicBound = viewport.indexOf("max-height: min(68dvh, 720px)");
  assert.ok(fixedFallback >= 0, "missing fixed viewport fallback");
  assert.ok(vhFallback > fixedFallback, "vh fallback must follow fixed fallback");
  assert.ok(dynamicBound > vhFallback, "dvh bound must follow compatible fallbacks");
  assert.match(
    viewport,
    /max-height:\s*620px[\s\S]*max-height:\s*min\(64vh, 620px\)[\s\S]*max-height:\s*min\(64dvh, 620px\)/,
  );
  assert.match(viewport, /-webkit-overflow-scrolling:\s*touch/);
  assert.match(declarationsFor(css, ".tools"), /position:\s*static/);
});

test("shipped styles preserve readable tiles and accessible holding targets", async () => {
  const css = await readFile("style.css", "utf8");
  const slot = declarationsFor(css, ".holding-slot");
  const tileHeights = [...css.matchAll(/--tile-height:\s*(\d+)px/g)]
    .map((match) => Number(match[1]));

  assert.match(slot, /min-width:\s*44px/);
  assert.match(slot, /min-height:\s*44px/);
  assert.ok(tileHeights.length > 0);
  assert.ok(tileHeights.every((height) => height >= 44), tileHeights.join(", "));
});

test("shipped styles expose non-color holding, target and reveal states", async () => {
  const css = await readFile("style.css", "utf8");
  for (const selector of [
    ".holding-slot",
    ".holding-empty",
    ".occupied",
    ".holding-added",
    ".reveal-flip",
    ".valid-target",
    ".invalid-target",
  ]) assert.ok(css.includes(selector), `missing ${selector}`);

  assert.match(declarationsFor(css, ".holding-slot.selected"), /outline|border-style|box-shadow/);
  assert.match(declarationsFor(css, ".valid-target"), /outline|border-style/);
  assert.match(declarationsFor(css, ".invalid-target"), /outline|border-style/);
  assert.match(declarationsFor(css, ".occupied"), /outline|border-style|box-shadow/);
  assert.match(declarationsFor(css, ".holding-added"), /border-style:/);
  assert.match(declarationsFor(css, ".reveal-flip"), /animation:/);
});

test("holding slot assembly is triggered only by item use, never durable render state", async () => {
  const game = await readFile("game.js", "utf8");
  const render = game.slice(
    game.indexOf("function render()"),
    game.indexOf("function updateScrollHint()"),
  );
  const item = game.slice(
    game.indexOf('$("holdingPlus").addEventListener'),
    game.indexOf('$("restart").addEventListener'),
  );

  assert.doesNotMatch(render, /holding-added|assembleHoldingSlot/);
  assert.match(item, /holdingBoosted\s*=\s*true/);
  assert.match(item, /render\(\);[\s\S]*assembleHoldingSlot\(/);
  assert.equal(game.match(/assembleHoldingSlot\(/g)?.length, 1);
});

test("board viewport announces both scrolling axes", async () => {
  const html = await readFile("index.html", "utf8");
  assert.match(
    html,
    /id="boardViewport"[\s\S]*aria-label="게임판, 큰 보드는 가로와 세로로 스크롤하세요"/,
  );
  assert.doesNotMatch(html, /좌우로 스크롤하세요/);
});

test("shipped styles use local pixel assets and fully settle reduced-motion states", async () => {
  const css = await readFile("style.css", "utf8");
  const urls = [...css.matchAll(/url\(["']?([^"')]+)["']?\)/g)]
    .map((match) => match[1]);
  const reduced = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"));

  assert.deepEqual(new Set(urls), new Set([
    "./assets/fonts/Galmuri11.woff2",
    "./assets/fonts/Galmuri11-Bold.woff2",
    "./assets/pixel-guardian-atlas.png",
    "./assets/pixel-special-atlas.png",
  ]));
  assert.doesNotMatch(css, /\p{Extended_Pictographic}/u);
  assert.doesNotMatch(css, /lantern|pagoda|chinese|palace|gold-ornament/i);
  assert.match(reduced, /\.reveal-flip/);
  assert.match(reduced, /\.holding-added/);
  assert.match(reduced, /transform:\s*none\s*!important/);
  assert.match(reduced, /animation:\s*none\s*!important/);
  assert.match(reduced, /transition:\s*none\s*!important/);
});
