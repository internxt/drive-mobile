const { getDefaultConfig } = require('expo/metro-config');
const { withShareExtension } = require('expo-share-extension/metro');

const config = (() => {
  const baseConfig = getDefaultConfig(__dirname);
  const { transformer, resolver } = baseConfig;

  // SVG transformer - use /expo for compatibility with Expo SDK 53
  baseConfig.transformer = {
    ...transformer,
    babelTransformerPath: require.resolve('react-native-svg-transformer/expo'),
  };

  baseConfig.resolver = {
    ...resolver,
    assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
    sourceExts: [...resolver.sourceExts, 'svg'],
    // Polyfills for Node.js modules required by dependencies
    extraNodeModules: {
      crypto: require.resolve('react-native-crypto'),
      stream: require.resolve('stream-browserify'),
    },
  };

  return baseConfig;
})();

module.exports = withShareExtension(config);
