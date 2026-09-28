import test from "node:test";
import assert from "node:assert/strict";
import * as savedGame from "./saved-game.js";

test("current-game save failure warns once until a later successful save", () => {
  assert.equal(typeof savedGame.createSaveWriter, "function");
  if (typeof savedGame.createSaveWriter !== "function") return;

  let blocked = true;
  let warnings = 0;
  const values = new Map();
  const storage = {
    setItem(key, value) {
      if (blocked) throw Error("quota");
      values.set(key, value);
    },
  };
  const writer = savedGame.createSaveWriter(storage, "save-key", () => warnings++);

  assert.equal(writer.write({ moves: 1 }), false);
  assert.equal(writer.write({ moves: 2 }), false);
  assert.equal(warnings, 1);
  assert.equal(writer.storageError, true);

  blocked = false;
  assert.equal(writer.write({ moves: 3 }), true);
  assert.equal(values.get("save-key"), '{"moves":3}');
  assert.equal(writer.storageError, false);

  blocked = true;
  assert.equal(writer.write({ moves: 4 }), false);
  assert.equal(warnings, 2);
});

test("the v4 writer leaves the previous active-game key untouched", () => {
  assert.equal(savedGame.SAVE_KEY, "twelve-puzzle-game-v4");
  const values = new Map([["twelve-puzzle-game-v3", "legacy-run"]]);
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const writer = savedGame.createSaveWriter(storage, savedGame.SAVE_KEY);

  assert.equal(writer.write({ version: 3 }), true);
  assert.equal(values.get(savedGame.SAVE_KEY), '{"version":3}');
  assert.equal(values.get("twelve-puzzle-game-v3"), "legacy-run");
});
