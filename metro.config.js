// const { getDefaultConfig } = require('@expo/metro-config');

// module.exports = (async () => {
//   const { resolver, transformer } = await getDefaultConfig(__dirname);

//   return {
//     transformer: {
//       ...transformer,
//       babelTransformerPath: require.resolve('react-native-svg-transformer'),
//       assetPlugins: ['expo-asset/tools/hashAssetFiles'],
//     },
//     resolver: {
//       ...resolver,
//       extraNodeModules: require('node-libs-react-native'),
//       assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
//       sourceExts: [...resolver.sourceExts, 'svg', 'jsx', 'js', 'ts', 'tsx', 'cjs'],
//     },
//   };
// })();

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
    extraNodeModules: require('node-libs-react-native'),
  },
};
