// Public configuration, bundled into the app. Never put credentials here.
export const releaseConfig = {
  appName: "열두 퍼즐",
  publisher: "원웨이컴퍼니",
  supportEmail: "qkdqor19@icloud.com",
  privacyUrl: "",
  audience: "unset", // Decide and review age handling before enabling ads.
  ads: {
    enabled: false,
    testMode: true,
    audienceReviewed: false,
    androidRewardedId: "ca-app-pub-3940256099942544/5224354917",
    iosRewardedId: "ca-app-pub-3940256099942544/1712485313",
  },
};

export function adsAllowed(config, platform) {
  return ["android", "ios"].includes(platform) &&
    config.ads.enabled === true && config.ads.audienceReviewed === true &&
    config.audience === "general";
}
