import { copyFile, mkdir } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const source = new URL("node_modules/galmuri/", root);
const target = new URL("assets/fonts/", root);
await mkdir(target, { recursive: true });
for (const [from, to] of [
  ["dist/Galmuri11.woff2", "Galmuri11.woff2"],
  ["dist/Galmuri11-Bold.woff2", "Galmuri11-Bold.woff2"],
  ["dist/LICENSE.txt", "OFL-Galmuri.txt"],
]) {
  await copyFile(new URL(from, source), new URL(to, target));
}
console.log("Prepared Galmuri11 Regular/Bold and OFL-1.1 license.");
