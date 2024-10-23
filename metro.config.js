const { getDefaultConfig } = require('@expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  isCSSEnabled: false,
});

module.exports = {
  ...config,
  transformer: {
    ...config.transformer,
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
    assetPlugins: ['expo-asset/tools/hashAssetFiles'],
  },
  resolver: {
    ...config.resolver,
    assetExts: config.resolver.assetExts.filter((ext) => ext !== 'svg'),
    sourceExts: [...config.resolver.sourceExts, 'svg'],
    extraNodeModules: require('node-libs-react-native'),
  },
};
