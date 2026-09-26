import test from "node:test";
import assert from "node:assert/strict";
import { createNativeRewarded, REWARD_EVENTS as E } from "./native-adapter.js";
import { adsAllowed, releaseConfig } from "./release-config.js";
import { createAdService } from "./ads.js";

function fixture(overrides = {}, timeoutMs = 500) {
  const handlers = new Map(), calls = [];
  let show;
  const shown = new Promise((resolve) => { show = resolve; });
  const sdk = {
    async requestConsentInfo() { calls.push("consent"); return { canRequestAds: true, status: "NOT_REQUIRED" }; },
    async initialize() { calls.push("initialize"); },
    async addListener(name, fn) { handlers.set(name, fn); return { async remove() { handlers.delete(name); } }; },
    async prepareRewardVideoAd(options) { calls.push(options); },
    showRewardVideoAd() { show(); return new Promise(() => {}); },
    ...overrides,
  };
  return { sdk, calls, handlers, shown, emit: (name) => handlers.get(name)?.(),
    adapter: createNativeRewarded({ sdk, adId: "test-unit", testMode: true, timeoutMs }) };
}

test("disabled and audience-unreviewed configs never allow native ads", () => {
  assert.equal(adsAllowed(releaseConfig, "android"), false);
  const config = structuredClone(releaseConfig);
  config.ads.enabled = true;
  assert.equal(adsAllowed(config, "ios"), false);
  config.audience = "general";
  config.ads.audienceReviewed = true;
  assert.equal(adsAllowed(config, "ios"), true);
  assert.equal(adsAllowed(config, "web"), false);
  config.audience = "children";
  assert.equal(adsAllowed(config, "android"), false);
});
test("reward requires SDK event AND dismissal, consent precedes initialization", async () => {
  const f = fixture();
  let settled = false;
  const result = f.adapter.rewarded().then((value) => { settled = true; return value; });
  await f.shown;
  assert.deepEqual(f.calls.slice(0, 2), ["consent", "initialize"]);
  assert.equal(f.calls[2].npa, true);
  f.emit(E.reward);
  f.emit(E.reward);
  await Promise.resolve();
  assert.equal(settled, false);
  f.emit(E.dismiss);
  assert.equal(await result, "earned");
  assert.equal(f.handlers.size, 0);
});
test("closing without reward is cancelled even when show promise never resolves", async () => {
  const f = fixture(); const result = f.adapter.rewarded(); await f.shown;
  f.emit(E.dismiss);
  assert.equal(await result, "cancelled");
  assert.equal(f.handlers.size, 0);
});
test("required consent form must allow requests before initialize/load", async () => {
  const f = fixture({
    async requestConsentInfo() { return { status: "REQUIRED", isConsentFormAvailable: true, canRequestAds: false }; },
    async showConsentForm() { return { canRequestAds: false }; },
  });
  assert.equal(await f.adapter.rewarded(), "unavailable");
  assert.deepEqual(f.calls, []);
});
test("consent service failure fails closed", async () => {
  const f = fixture({ requestConsentInfo() { throw new Error("offline"); } });
  assert.equal(await f.adapter.rewarded(), "unavailable");
  assert.equal(f.handlers.size, 0);
});
test("show promise resolution alone does not reward", async () => {
  const f = fixture({ showRewardVideoAd: async () => ({ amount: 1 }) }, 15);
  assert.equal(await f.adapter.rewarded(), "unavailable");
  assert.equal(f.handlers.size, 0);
});
test("load or presentation failure gives no reward and removes listeners", async () => {
  for (const event of [E.loadFailure, E.showFailure]) {
    const f = fixture(); const result = f.adapter.rewarded(); await f.shown;
    f.emit(event);
    assert.equal(await result, "unavailable");
    assert.equal(f.handlers.size, 0);
  }
  const f = fixture({ prepareRewardVideoAd() { throw new Error("no fill"); } });
  assert.equal(await f.adapter.rewarded(), "unavailable");
  assert.equal(f.handlers.size, 0);
});
test("single flight and privacy options cannot overlap a reward", async () => {
  const f = fixture(); const result = f.adapter.rewarded(); await f.shown;
  assert.equal(await f.adapter.rewarded(), "busy");
  assert.equal(await f.adapter.privacyOptions(), "unavailable");
  f.emit(E.dismiss); await result;
});
test("timeout quarantines session so late events cannot reward another attempt", async () => {
  const f = fixture({}, 15); const result = f.adapter.rewarded(); await f.shown;
  const lateReward = f.handlers.get(E.reward), lateDismiss = f.handlers.get(E.dismiss);
  assert.equal(await result, "unavailable");
  lateReward(); lateDismiss();
  assert.equal(await f.adapter.rewarded(), "unavailable");
  assert.equal(f.handlers.size, 0);
});
test("timeout during consent never initializes SDK when consent resolves late", async () => {
  let resolveConsent;
  const f = fixture({ requestConsentInfo: () => new Promise((resolve) => { resolveConsent = resolve; }) }, 15);
  assert.equal(await f.adapter.rewarded(), "unavailable");
  resolveConsent({ canRequestAds: true });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(f.calls, []);
});
test("privacy options only appear when UMP requires them, with no ad initialization", async () => {
  let forms = 0;
  const f = fixture({
    async requestConsentInfo() { return { privacyOptionsRequirementStatus: "REQUIRED" }; },
    async showPrivacyOptionsForm() { forms++; },
  });
  assert.equal(await f.adapter.privacyOptions(), "updated");
  assert.equal(forms, 1);
  assert.deepEqual(f.calls, []);
  assert.equal(await fixture().adapter.privacyOptions(), "not-required");
});
test("default ad service and exceptions never simulate earned reward", async () => {
  assert.equal(await createAdService().rewarded("undo"), "unavailable");
  assert.equal(await createAdService(() => { throw Error(); }).rewarded("undo"), "unavailable");
});
