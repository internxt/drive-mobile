const { getDefaultConfig } = require('expo/metro-config');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);
  const { transformer, resolver } = config;

  // SVG transformer - use /expo for compatibility with Expo SDK 53
  config.transformer = {
    ...transformer,
    babelTransformerPath: require.resolve('react-native-svg-transformer/expo'),
  };

  config.resolver = {
    ...resolver,
    assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
    sourceExts: [...resolver.sourceExts, 'svg'],
    // Polyfills for Node.js modules required by dependencies
    extraNodeModules: {
      crypto: require.resolve('react-native-crypto'),
      stream: require.resolve('stream-browserify'),
    },
  };

  return config;
})();
