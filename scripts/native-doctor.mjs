import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
let failures = 0;
function check(label, ok, detail) {
  console.log(`${ok ? "PASS" : "BLOCKED"} ${label}: ${detail}`);
  if (!ok) failures++;
}
const xcode = spawnSync("xcodebuild", ["-version"], { encoding: "utf8" });
check("Xcode", xcode.status === 0, (xcode.stdout || xcode.stderr || "not installed").trim());
const java = spawnSync("java", ["-version"], { encoding: "utf8" });
check("Java (Android needs JDK 21)", java.status === 0 && /version "21[.\"]/.test(java.stderr), (java.stderr || "not installed").trim());
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || `${homedir()}/Library/Android/sdk`;
check("Android SDK", existsSync(`${sdk}/platforms/android-36`), `${sdk}/platforms/android-36`);
const adb = spawnSync(`${sdk}/platform-tools/adb`, ["devices"], { encoding: "utf8" });
check("Android device", adb.status === 0 && /\tdevice\b/.test(adb.stdout), adb.stdout || "No connected authorized Android device detected");
console.log("Signing accounts, iOS pairing and store console readiness must be verified separately. This command changes no settings.");
process.exitCode = failures ? 1 : 0;
