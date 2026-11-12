const { getDefaultConfig } = require('expo/metro-config');
const { withShareExtension } = require('expo-share-extension/metro');
const { withNativeWind } = require('nativewind/metro');

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

const TAILWIND_RN_REM_IN_PIXELS = 16;

module.exports = withNativeWind(withShareExtension(config), {
  input: './global.css',
  inlineRem: TAILWIND_RN_REM_IN_PIXELS,
});
