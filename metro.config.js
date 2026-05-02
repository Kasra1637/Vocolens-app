// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Disable Watchman for file watching.
config.resolver.useWatchman = false;

// Improve stability and prevent tunnel timeouts
config.server = {
  ...config.server,
  port: 8081,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Add timeout handling
      res.setTimeout(30000); // 30 second timeout
      return middleware(req, res, next);
    };
  },
};

// Increase max workers for better performance
config.maxWorkers = 2;

// Configure asset and source extensions.
const { assetExts, sourceExts } = config.resolver;

config.transformer = {
  ...config.transformer,
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
    // Mock native-only modules on web
    if (platform === "web") {
      const nativeOnlyModules = [
        "react-native-pager-view",
        "reanimated-tab-view",
        "@bottom-tabs/react-navigation",
      ];

      if (nativeOnlyModules.some((mod) => moduleName.includes(mod))) {
        return {
          type: "empty",
        };
      }
    }

    // Fallback to default resolution
    return context.resolveRequest(context, moduleName, platform);
  },
};

// Integrate NativeWind with the Metro configuration.
module.exports = withNativeWind(config, { input: "./global.css" });
