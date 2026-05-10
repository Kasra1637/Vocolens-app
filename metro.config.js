// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Disable Watchman for file watching.
config.resolver.useWatchman = false;

// Completely disable tunneling at Metro level
config.server = {
  ...config.server,
  port: parseInt(process.env.PORT) || parseInt(process.env.METRO_PORT) || 8081,
  runInspectorProxy: false,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Disable any tunnel-related middleware
      if (req.url && req.url.includes("tunnel")) {
        res.statusCode = 404;
        res.end("Tunnel disabled");
        return;
      }
      return middleware(req, res, next);
    };
  },
};

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
