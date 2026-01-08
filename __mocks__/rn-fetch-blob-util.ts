jest.mock('react-native-blob-util', () => ({
  android: {
    actionViewIntent: jest.fn(),
  },
  ios: {
    openDocument: jest.fn(),
    previewDocument: jest.fn(),
  },
  config: jest.fn(),
  fs: {
    dirs: {
      DocumentDir: 'yourdocumentdir',
      DownloadDir: 'yourdownloadsdir',
    },
  },
}));
