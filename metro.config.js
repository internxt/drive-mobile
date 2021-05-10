/* eslint-disable camelcase */
module.exports = {
  transformer: {
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
  }
};
