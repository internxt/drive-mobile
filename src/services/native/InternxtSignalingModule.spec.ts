const mockLoggerWarn = jest.fn();

jest.mock('../common', () => ({
  logger: { info: jest.fn(), warn: mockLoggerWarn, error: jest.fn() },
}));

type Wrapper = typeof import('./InternxtSignalingModule');

/**
 * The wrapper resolves the native bridge at module-load time from `Platform.OS` and
 * `NativeModules`, so each scenario loads a fresh copy of the module under a tailored
 * `react-native` mock.
 */
const loadWrapper = (platformOS: 'android' | 'ios', nativeModule: unknown): { wrapper: Wrapper } => {
  let wrapper!: Wrapper;
  jest.isolateModules(() => {
    jest.doMock('react-native', () => ({
      Platform: { OS: platformOS },
      NativeModules: nativeModule === undefined ? {} : { InternxtSignalingModule: nativeModule },
    }));
    wrapper = require('./InternxtSignalingModule');
  });
  return { wrapper };
};

/**
 * Builds a native bridge mock and loads the wrapper against it, returning the spy so each
 * test only states the platform and asserts the resulting behaviour.
 */
const arrangePresentNative = (platformOS: 'android' | 'ios') => {
  const native = jest.fn().mockResolvedValue(undefined);
  const { wrapper } = loadWrapper(platformOS, { notifyParentChanged: native });
  return { wrapper, native };
};

describe('InternxtSignalingModule wrapper', () => {
  afterEach(() => {
    jest.resetModules();
    mockLoggerWarn.mockReset();
  });

  it('when on Android with a valid uuid, then it invokes the native module with that uuid', async () => {
    const { wrapper, native } = arrangePresentNative('android');

    await wrapper.notifyParentChanged('folder-uuid-123');

    expect(native).toHaveBeenCalledWith('folder-uuid-123');
  });

  it('when on iOS, then it resolves without invoking the native module', async () => {
    const { wrapper, native } = arrangePresentNative('ios');

    await expect(wrapper.notifyParentChanged('folder-uuid-123')).resolves.toBeUndefined();

    expect(native).not.toHaveBeenCalled();
  });

  it('when the uuid is empty, then it resolves without invoking the native module', async () => {
    const { wrapper, native } = arrangePresentNative('android');

    await expect(wrapper.notifyParentChanged('')).resolves.toBeUndefined();

    expect(native).not.toHaveBeenCalled();
  });

  it('when the uuid is not a string, then it resolves without invoking the native module', async () => {
    const { wrapper, native } = arrangePresentNative('android');

    await expect(wrapper.notifyParentChanged(undefined as unknown as string)).resolves.toBeUndefined();

    expect(native).not.toHaveBeenCalled();
  });

  it('when the native module is absent, then it resolves without throwing', async () => {
    const { wrapper } = loadWrapper('android', undefined);

    await expect(wrapper.notifyParentChanged('folder-uuid-123')).resolves.toBeUndefined();
  });

  it('when the native module rejects, then it resolves without throwing', async () => {
    const { wrapper, native } = arrangePresentNative('android');
    native.mockRejectedValueOnce(new Error('E_INVALID_FOLDER'));

    await expect(wrapper.notifyParentChanged('folder-uuid-123')).resolves.toBeUndefined();

    expect(mockLoggerWarn).toHaveBeenCalledTimes(1);
  });
});
