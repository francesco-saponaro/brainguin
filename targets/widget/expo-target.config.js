/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  icon: "../../assets/images/main.png",
  entitlements: {
    "com.apple.security.application-groups": ["group.com.brainguin.app"],
  },
});
