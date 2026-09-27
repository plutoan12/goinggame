import { mkdir, copyFile } from "node:fs/promises";
import { build } from "esbuild";
import { resetDirectory } from "./reset-dir.mjs";
await import("./prepare-fonts.mjs");
const root = new URL("../", import.meta.url);
await resetDirectory(new URL("dist/", root));
const files = [
  "index.html",
  "style.css",
  "privacy.html",
  "LICENSE",
  "assets/pixel-guardian-atlas.png",
  "assets/pixel-special-atlas.png",
  "assets/app-icon.png",
  "assets/fonts/Galmuri11.woff2",
  "assets/fonts/Galmuri11-Bold.woff2",
  "assets/fonts/OFL-Galmuri.txt",
];
await mkdir(new URL("dist/assets/fonts/", root), { recursive: true });
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
