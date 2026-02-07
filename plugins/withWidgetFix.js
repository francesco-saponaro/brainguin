const { withXcodeProject } = require("@expo/config-plugins");

const withWidgetFix = (config) => {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const targetName = "widget";

    const target = xcodeProject.pbxTargetByName(targetName);

    if (!target) {
      console.warn(
        `⚠️ Target '${targetName}' not found. Verify @bacons/apple-targets is running before this plugin.`,
      );
      return config;
    }

    const xcConfigurationList =
      xcodeProject.pbxXCConfigurationList()[target.buildConfigurationList];
    const buildConfigurations = xcConfigurationList.buildConfigurations;

    buildConfigurations.forEach((configItem) => {
      const buildSettings =
        xcodeProject.pbxXCBuildConfigurationSection()[configItem.value]
          .buildSettings;

      // 🛠️ THE FIX: Point directly to the internal Xcode compiler.
      // We do NOT use quotes here; the library handles escaping automatically.
      buildSettings["CC"] = "$(DT_TOOLCHAIN_DIR)/usr/bin/clang";
      buildSettings["CXX"] = "$(DT_TOOLCHAIN_DIR)/usr/bin/clang++";
      buildSettings["LD"] = "$(DT_TOOLCHAIN_DIR)/usr/bin/clang";
      buildSettings["LDPLUSPLUS"] = "$(DT_TOOLCHAIN_DIR)/usr/bin/clang++";
    });

    console.log(`✅ Fixed compiler settings for target: ${targetName}`);

    return config;
  });
};

module.exports = withWidgetFix;
