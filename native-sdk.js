import { AdMob } from "@capacitor-community/admob";
import { createNativeRewarded } from "./native-adapter.js";
import { releaseConfig, adsAllowed } from "./release-config.js";

export function connectNativeAds(platform) {
  if (!adsAllowed(releaseConfig, platform)) return null;
  return createNativeRewarded({
    sdk: AdMob,
    testMode: releaseConfig.ads.testMode,
    adId: platform === "ios" ? releaseConfig.ads.iosRewardedId : releaseConfig.ads.androidRewardedId,
  });
}
