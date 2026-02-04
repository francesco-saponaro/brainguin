const { withXcodeProject } = require("@expo/config-plugins");

const withWidgetFix = (config) => {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    // Your log says: (in target 'widget' from project 'BrainGuin')
    // So the target name is definitely 'widget'
    const targetName = "widget";

    const target = xcodeProject.pbxTargetByName(targetName);

    if (!target) {
      // If the target isn't found, it might be named differently or not created yet.
      // We log a warning but don't crash the build.
      console.warn(
        `⚠️ [withWidgetFix] Could not find target '${targetName}'! Check if @bacons/apple-targets ran first.`,
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

      // 🔴 THE FIX: Remove these React Native compiler overrides
      // This forces the widget to use the standard Apple Compiler (clang)
      // which doesn't rely on node_modules scripts.
      delete buildSettings["CC"];
      delete buildSettings["CXX"];
      delete buildSettings["LD"];
      delete buildSettings["LDPLUSPLUS"];
    });

    console.log(
      `✅ [withWidgetFix] Fixed compiler settings for '${targetName}'`,
    );

    return config;
  });
};

module.exports = withWidgetFix;
