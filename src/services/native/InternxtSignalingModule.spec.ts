const mockLoggerWarn = jest.fn();

jest.mock('../common', () => ({
  logger: { info: jest.fn(), warn: mockLoggerWarn, error: jest.fn() },
}));

type Wrapper = typeof import('./InternxtSignalingModule');

const loadWrapper = (nativeModule: unknown): { wrapper: Wrapper } => {
  let wrapper!: Wrapper;
  jest.isolateModules(() => {
    jest.doMock('react-native', () => ({
      NativeModules: nativeModule === undefined ? {} : { InternxtSignalingModule: nativeModule },
    }));
    wrapper = require('./InternxtSignalingModule');
  });
  return { wrapper };
};

const arrangePresentNative = () => {
  const native = jest.fn().mockResolvedValue(undefined);
  const { wrapper } = loadWrapper({ notifyParentChanged: native });
  return { wrapper, native };
};

describe('InternxtSignalingModule wrapper', () => {
  afterEach(() => {
    jest.resetModules();
    mockLoggerWarn.mockReset();
  });

  test('when the native bridge is present with a valid uuid, then it invokes the native module with that uuid', async () => {
    const { wrapper, native } = arrangePresentNative();

    await wrapper.notifyParentChanged('folder-uuid-123');

    expect(native).toHaveBeenCalledWith('folder-uuid-123');
  });

  test('when the uuid is empty, then it resolves without invoking the native module', async () => {
    const { wrapper, native } = arrangePresentNative();

    await expect(wrapper.notifyParentChanged('')).resolves.toBeUndefined();

    expect(native).not.toHaveBeenCalled();
  });

  test('when the uuid is not a string, then it resolves without invoking the native module', async () => {
    const { wrapper, native } = arrangePresentNative();

    await expect(wrapper.notifyParentChanged(undefined as unknown as string)).resolves.toBeUndefined();

    expect(native).not.toHaveBeenCalled();
  });

  test('when the native module is absent, then it resolves without throwing', async () => {
    const { wrapper } = loadWrapper(undefined);

    await expect(wrapper.notifyParentChanged('folder-uuid-123')).resolves.toBeUndefined();
  });

  test('when the native module rejects, then it resolves without throwing', async () => {
    const { wrapper, native } = arrangePresentNative();
    native.mockRejectedValueOnce(new Error('E_INVALID_FOLDER'));

    await expect(wrapper.notifyParentChanged('folder-uuid-123')).resolves.toBeUndefined();

    expect(mockLoggerWarn).toHaveBeenCalledTimes(1);
  });
});
