jest.mock('rn-fetch-blob', () => {
  return {
    DocumentDir: () => {
      return undefined;
    },
    ImageCache: {
      get: {
        clear: () => {
          return undefined;
        },
      },
    },
    fs: {
      dirs: {
        MainBundleDir: () => {
          return undefined;
        },
        CacheDir: () => {
          return undefined;
        },
        DocumentDir: () => {
          return undefined;
        },
      },
    },
  };
});
