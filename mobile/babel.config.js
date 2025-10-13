module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      "react-native-reanimated/plugin", // 👈 must be LAST in the list for older plugins, but with Expo 54 keep it present
    ],
  };
};
