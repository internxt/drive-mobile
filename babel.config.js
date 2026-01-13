module.exports = function (api) {
  api.cache(false);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
          root: ['.'],
          alias: {
            // react-native-pdf uses react-native-blob-util under the hood
            // but we don't yet, installing the dependency causes duplicated
            // iOS symbols so we maintain rn-fetch-blob for now
            'react-native-blob-util': 'rn-fetch-blob',
            '@internxt-mobile/ui-kit': './src/components/ui-kit/index.ts',
            '@internxt-mobile/hooks': './src/hooks',
            '@internxt-mobile/services': './src/services',
            '@internxt-mobile/types': './src/types',
            '@internxt-mobile/useCases': './src/useCases',
            '@internxt-mobile/contexts': './src/contexts',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
