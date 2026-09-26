import sharp from "sharp";
import { readdir, mkdir } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const source = new URL("assets/app-icon-source.png", root).pathname;
const background = "#66ad82";
await sharp(source).resize(1024, 1024).flatten({ background }).removeAlpha()
  .png().toFile(new URL("assets/app-icon.png", root).pathname);
await sharp(source).resize(1024, 1024).flatten({ background }).removeAlpha()
  .png().toFile(new URL("ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png", root).pathname);
for (const [density, size] of Object.entries({ mdpi:48, hdpi:72, xhdpi:96, xxhdpi:144, xxxhdpi:192 })) {
  const dir = new URL(`android/app/src/main/res/mipmap-${density}/`, root);
  for (const name of ["ic_launcher.png", "ic_launcher_round.png"])
    await sharp(source).resize(size, size).flatten({ background }).png().toFile(new URL(name, dir).pathname);
  const adaptiveSize = Math.round(size * 108 / 48);
  const insetSize = Math.floor(adaptiveSize * 0.62);
  const inset = await sharp(source).resize(insetSize, insetSize).png().toBuffer();
  await sharp({ create: { width: adaptiveSize, height: adaptiveSize, channels: 4, background } })
    .composite([{ input: inset, gravity: "centre" }]).png()
    .toFile(new URL("ic_launcher_foreground.png", dir).pathname);
}
// Preserve platform resource dimensions while replacing template splash art.
const res = new URL("android/app/src/main/res/", root);
const splashFiles = [];
for (const dir of await readdir(res, { withFileTypes: true })) {
  if (!dir.isDirectory() || !dir.name.startsWith("drawable")) continue;
  for (const file of await readdir(new URL(`${dir.name}/`, res)))
    if (file === "splash.png") splashFiles.push(new URL(`${dir.name}/${file}`, res));
}
const iosSplash = new URL("ios/App/App/Assets.xcassets/Splash.imageset/", root);
for (const file of await readdir(iosSplash))
  if (file.endsWith(".png")) splashFiles.push(new URL(file, iosSplash));
for (const file of splashFiles) {
  const { width, height } = await sharp(file.pathname).metadata();
  const side = Math.round(Math.min(width, height) * 0.32);
  const mark = await sharp(source).resize(side, side).png().toBuffer();
  await sharp({ create: { width, height, channels: 3, background } })
    .composite([{ input: mark, gravity: "centre" }]).png().toFile(file.pathname + ".tmp");
  const { rename } = await import("node:fs/promises");
  await rename(file.pathname + ".tmp", file.pathname);
}
await mkdir(new URL("release-artifacts/", root), { recursive: true });
await sharp(source).resize(512, 512).flatten({ background }).removeAlpha()
  .png().toFile(new URL("release-artifacts/google-play-icon-512.png", root).pathname);
console.log("Generated opaque iOS/Play icons, Android safe-zone launcher icons, and native splash images.");
