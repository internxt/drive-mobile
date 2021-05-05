module.exports = {
  transformer: {
    assetPlugins: ['expo-asset/tools/hashAssetFiles'],
    minifierPath: 'metro-minify-terser',
    minifierConfig: {
      keepClassnames: true, // FIX typeorm
      keepFnames: true, // FIX typeorm
      mangle: {
        // toplevel: false,
        keepClassnames: true, // FIX typeorm
        keepFnames: true // FIX typeorm
      }
    }
  }
};
