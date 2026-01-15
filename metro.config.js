const { getDefaultConfig } = require('@expo/metro-config');
const { withShareExtension } = require('expo-share-extension/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  isCSSEnabled: false,
});

const configWithShareExtension = withShareExtension(config);

// Debug: log all bundle requests
const originalRewriteRequestUrl = configWithShareExtension.server?.rewriteRequestUrl || ((url) => url);
configWithShareExtension.server = {
  ...configWithShareExtension.server,
  rewriteRequestUrl: (url) => {
    console.log('📦 [Metro] Request URL:', url);
    const result = originalRewriteRequestUrl(url);
    console.log('📦 [Metro] Rewritten URL:', result);
    return result;
  },
};

module.exports = {
  ...configWithShareExtension,
  transformer: {
    ...configWithShareExtension.transformer,
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
    assetPlugins: ['expo-asset/tools/hashAssetFiles'],
  },
  resolver: {
    ...configWithShareExtension.resolver,
    assetExts: configWithShareExtension.resolver.assetExts.filter((ext) => ext !== 'svg'),
    sourceExts: [...configWithShareExtension.resolver.sourceExts, 'svg'],
    extraNodeModules: require('node-libs-react-native'),
  },
};
