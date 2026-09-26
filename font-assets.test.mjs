import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const pkg = JSON.parse(await readFile("package.json", "utf8"));
const files = ["Galmuri11.woff2", "Galmuri11-Bold.woff2", "OFL-Galmuri.txt"];

test("pinned Galmuri fonts and license ship in the offline bundle", async () => {
  assert.equal(pkg.dependencies.galmuri, "2.40.3");
  for (const file of files) {
    assert.ok((await stat(`assets/fonts/${file}`)).size > 0, `source/${file}`);
    assert.ok((await stat(`dist/assets/fonts/${file}`)).size > 0, `dist/${file}`);
  }
  assert.match(await readFile("assets/fonts/OFL-Galmuri.txt", "utf8"), /SIL OPEN FONT LICENSE Version 1\.1/);
});

test("regular and bold pixel fonts use local swap-loading faces", async () => {
  const css = await readFile("style.css", "utf8");
  assert.match(css, /font-family:\s*"Galmuri11"/);
  assert.match(css, /Galmuri11\.woff2/);
  assert.match(css, /Galmuri11-Bold\.woff2/);
  assert.equal((css.match(/font-display:\s*swap/g) ?? []).length, 2);
  assert.match(css, /image-rendering:\s*pixelated/);
});

test("the four-lane tutorial stays inside a 320px phone viewport", async () => {
  const css = await readFile("style.css", "utf8");
  assert.match(css, /\.tutorial-dialog\s*\{[^}]*max-width:\s*calc\(100vw\s*-\s*16px\)/s);
  assert.match(css, /\.tutorial-dialog\s*\{[^}]*overflow-x:\s*hidden/s);
  assert.match(css, /\.tutorial-board\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/s);
});
