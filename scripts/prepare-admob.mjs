// Reproducible narrow fix for AdMob 8.1.0: on iOS UMP forms need the
// view-controller reference BEFORE MobileAds.initialize() can safely run.
// No SDK behavior is replaced, only the reference is bound earlier.
import { readFile, writeFile } from "node:fs/promises";
const base = new URL("../node_modules/@capacitor-community/admob/", import.meta.url);
const pkg = JSON.parse(await readFile(new URL("package.json", base), "utf8"));
if (pkg.version !== "8.1.0") throw new Error("Review the consent binding fix before upgrading AdMob.");
const path = new URL("ios/Sources/AdMobPlugin/AdMobPlugin.swift", base);
const source = await readFile(path, "utf8");
const target = "@objc func requestConsentInfo(_ call: CAPPluginCall) {";
const patched = target + "\n        self.consentExecutor.plugin = self // goinggame: bind before SDK initialization";
if (!source.includes(patched)) {
  if (source.split(target).length !== 2) throw new Error("AdMob source changed: consent binding fix not applied.");
  await writeFile(path, source.replace(target, patched));
}
console.log("AdMob iOS consent reference prepared (SDK is not initialized).");
