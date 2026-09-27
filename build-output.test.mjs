import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
