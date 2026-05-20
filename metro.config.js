// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Watchman is unavailable in this container environment
config.resolver.useWatchman = false;

// SVG support via react-native-svg-transformer
const { assetExts, sourceExts } = config.resolver;

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer"),
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

config.resolver = {
  ...config.resolver,
  assetExts: assetExts.filter((ext) => ext !== "svg"),
  sourceExts: [...sourceExts, "svg"],
  useWatchman: false,

  resolveRequest: (context, moduleName, platform) => {
    // Stub native-only packages when bundling for web
    if (platform === "web") {
      const webStubs = [
        "react-native-pager-view",
        "reanimated-tab-view",
        "@bottom-tabs/react-navigation",
        // These require custom native modules — stub on web only
        "react-native-purchases",
        "react-native-purchases-ui",
        "react-native-mmkv",
        "react-native-vision-camera",
        "react-native-maps",
        "react-native-ios-context-menu",
        "react-native-ios-utilities",
        "@shopify/react-native-skia",
        "lottie-react-native",
      ];
      if (webStubs.some((mod) => moduleName.startsWith(mod))) {
        return { type: "empty" };
      }
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = withNativeWind(config, { input: "./global.css" });
