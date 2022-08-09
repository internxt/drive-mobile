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
          },
        },
      ],
    ],
  };
};
