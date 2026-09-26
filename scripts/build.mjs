import { mkdir, copyFile } from "node:fs/promises";
import { build } from "esbuild";
const root = new URL("../", import.meta.url);
const files = [
  "index.html",
  "style.css",
  "privacy.html",
  "LICENSE",
  "assets/guardian-atlas-v3.png",
  "assets/app-icon.png",
];
await mkdir(new URL("dist/assets/", root), { recursive: true });
for (const file of files)
  await copyFile(new URL(file, root), new URL(`dist/${file}`, root));
await build({
  entryPoints: [new URL("game.js", root).pathname],
  outfile: new URL("dist/game.js", root).pathname,
  bundle: true, format: "esm", target: ["safari15", "chrome100"],
  minify: true, legalComments: "eof",
});
console.log(
  `Bundled game + ${files.length} assets into dist/. Ad activation follows release-config.js.`,
);
