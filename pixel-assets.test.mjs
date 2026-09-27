import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import * as guardianModule from "./guardians.js";

const { GUARDIANS, SPECIAL_SPRITES } = guardianModule;

async function cellHasVisibleAlpha(path, index, columns, rows) {
  const image = sharp(path);
  const metadata = await image.metadata();
  assert.equal(metadata.width % columns, 0, `${path} width/grid`);
  assert.equal(metadata.height % rows, 0, `${path} height/grid`);
  const width = metadata.width / columns;
  const height = metadata.height / rows;
  const { data } = await image
    .ensureAlpha()
    .extract({
      left: (index % columns) * width,
      top: Math.floor(index / columns) * height,
      width,
      height,
    })
    .extractChannel("alpha")
    .raw()
    .toBuffer({ resolveWithObject: true });
  return data.some((alpha) => alpha > 8);
}

test("pixel guardian atlas keeps the fixed 4x4 sprite contract", async () => {
  const path = "assets/pixel-guardian-atlas.png";
  const metadata = await sharp(path).metadata();
  assert.equal(metadata.width, metadata.height);
  assert.equal(metadata.width % 4, 0);
  assert.equal(metadata.height % 4, 0);
  assert.ok(metadata.channels >= 4, "guardian atlas must preserve transparency");
  for (let cell = 0; cell < 14; cell++)
    assert.equal(await cellHasVisibleAlpha(path, cell, 4, 4), true, `guardian cell ${cell}`);
  assert.equal(await cellHasVisibleAlpha(path, 14, 4, 4), false, "guardian blank cell 14");
  assert.equal(await cellHasVisibleAlpha(path, 15, 4, 4), false, "guardian blank cell 15");
});

test("special-rule atlas exposes eight transparent pixel icons", async () => {
  const path = "assets/pixel-special-atlas.png";
  const metadata = await sharp(path).metadata();
  assert.equal(metadata.width / metadata.height, 2);
  assert.equal(metadata.width % 4, 0);
  assert.equal(metadata.height % 2, 0);
  assert.ok(metadata.channels >= 4, "special atlas must preserve transparency");
  for (let cell = 0; cell < 8; cell++)
    assert.equal(await cellHasVisibleAlpha(path, cell, 4, 2), true, `special cell ${cell}`);
});

test("pixel app icon source is a square RGBA production asset", async () => {
  const metadata = await sharp("assets/pixel-app-icon-source.png").metadata();
  assert.equal(metadata.width, metadata.height);
  assert.ok(metadata.width >= 1024);
  assert.ok(metadata.channels >= 4);
});

test("sprite identities and special-rule cells stay in their approved order", () => {
  assert.deepEqual(GUARDIANS.map(([id]) => id), [
    "mouse", "ox", "tiger", "rabbit", "dragon", "snake", "horse",
    "sheep", "monkey", "rooster", "dog", "pig", "cat", "chick",
  ]);
  assert.deepEqual(SPECIAL_SPRITES, {
    question: 0,
    goal: 1,
    marked: 2,
    sealed: 3,
    unlocked: 4,
    sparkle: 5,
    selection: 6,
    empty: 7,
  });
});

test("animal art keeps a readable text fallback when the atlas fails", () => {
  assert.equal(typeof guardianModule.createPetArtElement, "function");
  assert.equal(typeof guardianModule.watchPetAtlas, "function");
  if (
    typeof guardianModule.createPetArtElement !== "function" ||
    typeof guardianModule.watchPetAtlas !== "function"
  ) return;

  const document = {
    createElement() {
      return {
        children: [],
        style: { values: {}, setProperty(key, value) { this.values[key] = value; } },
        append(child) { this.children.push(child); },
        setAttribute(key, value) { this[key] = value; },
      };
    },
  };
  const tiger = guardianModule.createPetArtElement(document, GUARDIANS, 2);
  assert.equal(tiger.className, "pet-art");
  assert.equal(tiger.children[0].className, "pet-fallback");
  assert.equal(tiger.children[0].textContent, "호");

  const classes = new Set();
  const root = {
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
    },
  };
  class FakeImage {}
  const probe = guardianModule.watchPetAtlas(FakeImage, root, "atlas.png");
  assert.equal(probe.src, "atlas.png");
  probe.onerror();
  assert.deepEqual([...classes], ["pet-atlas-failed"]);
  probe.onload();
  assert.deepEqual([...classes], ["pet-atlas-ready"]);
});

test("web build and native icon generation consume the pixel sources", async () => {
  const [css, html, build, icons] = await Promise.all([
    readFile("style.css", "utf8"),
    readFile("index.html", "utf8"),
    readFile("scripts/build.mjs", "utf8"),
    readFile("scripts/icons.mjs", "utf8"),
  ]);
  assert.match(css, /pixel-guardian-atlas\.png/);
  assert.match(css, /pixel-special-atlas\.png/);
  assert.doesNotMatch(css, /guardian-atlas-v3\.png/);
  assert.match(html, /pixel-guardian-atlas\.png/);
  assert.match(build, /pixel-guardian-atlas\.png/);
  assert.match(build, /pixel-special-atlas\.png/);
  assert.match(icons, /pixel-app-icon-source\.png/);
});
