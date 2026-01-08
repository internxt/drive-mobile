export default {
  fs: {
    dirs: {
      DocumentDir: '/mock/document',
      CacheDir: '/mock/cache',
      DownloadDir: '/mock/download',
    },
    readFile: jest.fn(() => Promise.resolve('')),
    writeFile: jest.fn(() => Promise.resolve()),
    writeStream: jest.fn(() =>
      Promise.resolve({
        write: jest.fn(() => Promise.resolve()),
        close: jest.fn(() => Promise.resolve()),
      }),
    ),
    createFile: jest.fn(() => Promise.resolve()),
    unlink: jest.fn(() => Promise.resolve()),
    exists: jest.fn(() => Promise.resolve(true)),
    stat: jest.fn(() => Promise.resolve({ size: 0 })),
    ls: jest.fn(() => Promise.resolve([])),
    mv: jest.fn(() => Promise.resolve()),
    cp: jest.fn(() => Promise.resolve()),
  },
  config: jest.fn(() => ({
    fetch: jest.fn(() => Promise.resolve({ data: '' })),
  })),
  fetch: jest.fn(() => Promise.resolve({ data: '' })),
  wrap: jest.fn((path: string) => path),
  polyfill: {
    Blob: jest.fn(),
    File: jest.fn(),
  },
};
