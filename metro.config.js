const { getDefaultConfig } = require('@expo/metro-config');

module.exports = (async () => {
  const {
    resolver: { sourceExts, assetExts }
  } = await getDefaultConfig(__dirname);

  return {
    transformer: {
      babelTransformerPath: require.resolve('react-native-svg-transformer'),
      assetPlugins: ['expo-asset/tools/hashAssetFiles'],
      minifierPath: 'metro-minify-terser',
      minifierConfig: {
        keep_classnames: true, // FIX typeorm
        keep_fnames: true, // FIX typeorm
        mangle: {
          // toplevel: false,
          keep_classnames: true, // FIX typeorm
          keep_fnames: true // FIX typeorm
        }
      }
    },
    resolver: {
      assetExts: assetExts.filter(ext => ext !== 'svg'),
      sourceExts: [...sourceExts, 'svg']
    }
  }
})()
