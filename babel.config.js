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
            '@internxt-mobile/ui-kit': './src/components/ui-kit/index.ts',
            '@internxt-mobile/hooks': './src/hooks',
            '@internxt-mobile/services': './src/services',
            '@internxt-mobile/types': './src/types',
            '@internxt-mobile/useCases': './src/useCases',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
