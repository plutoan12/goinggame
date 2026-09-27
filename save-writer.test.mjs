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
