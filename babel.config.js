module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./",
          },
          extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
        },
      ],
      // Worklets plugin must be last. Reanimated 4 split the babel plugin
      // out into the react-native-worklets package, so this replaces the
      // old "react-native-reanimated/plugin" path.
      "react-native-worklets/plugin",
    ],
  };
};
