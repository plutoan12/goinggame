// Injectable SDK boundary: no Capacitor/browser dependency, testable in Node.
export const REWARD_EVENTS = {
  reward: "onRewardedVideoAdReward",
  dismiss: "onRewardedVideoAdDismissed",
  loadFailure: "onRewardedVideoAdFailedToLoad",
  showFailure: "onRewardedVideoAdFailedToShow",
};

export function createNativeRewarded({ sdk, adId, testMode, timeoutMs = 180000 }) {
  let pending = false;
  let quarantined = false;
  let initialized = false;
  // Quarantine after timeout: late uncorrelated native events must never reward
  // the next attempt. Restarting the app is required after this rare failure.
  async function consent() {
    let info = await sdk.requestConsentInfo();
    if (info.status === "REQUIRED" && info.isConsentFormAvailable)
      info = await sdk.showConsentForm();
    return info;
  }
  return {
    async rewarded() {
      if (pending) return "busy";
      if (quarantined) return "unavailable";
      pending = true;
      const handles = [];
      let finished = false, showing = false, earned = false, timer;
      let finish;
      const result = new Promise((resolve) => {
        finish = (value) => {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          resolve(value);
        };
        timer = setTimeout(() => {
          quarantined = true;
          finish("unavailable");
        }, timeoutMs);
      });
      const listen = async (event, callback) => {
        const handle = await sdk.addListener(event, callback);
        if (finished) await handle.remove();
        else handles.push(handle);
      };
      // Don't await showRewardVideoAd: some native implementations leave its
      // promise unresolved on early dismissal. Only native events award items.
      const start = async () => {
        const info = await consent();
        if (finished) return;
        if (!info.canRequestAds) return finish("unavailable");
        if (!initialized) {
          await sdk.initialize({ initializeForTesting: testMode,
            maxAdContentRating: "General" });
          initialized = true;
        }
        if (finished) return;
        await listen(REWARD_EVENTS.reward, () => {
          if (showing && !finished) earned = true;
        });
        await listen(REWARD_EVENTS.dismiss, () => {
          if (showing) finish(earned ? "earned" : "cancelled");
        });
        await listen(REWARD_EVENTS.loadFailure, () => finish("unavailable"));
        await listen(REWARD_EVENTS.showFailure, () => finish("unavailable"));
        if (finished) return;
        await sdk.prepareRewardVideoAd({ adId, isTesting: testMode, npa: true });
        if (finished) return;
        showing = true;
        Promise.resolve(sdk.showRewardVideoAd()).catch(() => finish("unavailable"));
      };
      void start().catch(() => finish("unavailable"));
      try {
        return await result;
      } finally {
        await Promise.allSettled(handles.map((handle) => handle.remove()));
        pending = false;
      }
    },
    async privacyOptions() {
      if (pending || quarantined) return "unavailable";
      pending = true;
      let timer;
      try {
        const action = async () => {
          const info = await sdk.requestConsentInfo();
          if (quarantined) return "unavailable";
          if (info.privacyOptionsRequirementStatus !== "REQUIRED") return "not-required";
          await sdk.showPrivacyOptionsForm();
          return "updated";
        };
        return await Promise.race([action(), new Promise((resolve) => {
          timer = setTimeout(() => { quarantined = true; resolve("unavailable"); }, timeoutMs);
        })]);
      } catch {
        return "unavailable";
      } finally {
        clearTimeout(timer);
        pending = false;
      }
    },
  };
}
