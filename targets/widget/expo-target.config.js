/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  icon: "https://github.com/expo.png",
  deploymentTarget: "16.0", // Safe for iOS 17.5
  exportJs: false, // <--- ADD THIS! Official docs recommend it for widgets.
  entitlements: {
    "com.apple.security.application-groups":
      config.ios.entitlements["com.apple.security.application-groups"],
  },
});
