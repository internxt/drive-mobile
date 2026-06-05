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

describe('InternxtSignalingModule wrapper', () => {
  afterEach(() => {
    jest.resetModules();
  });

  it('when on Android with a valid uuid, then it invokes the native module with that uuid', async () => {
    // given
    const notifyParentChangedNative = jest.fn().mockResolvedValue(undefined);
    const { wrapper } = loadWrapper('android', { notifyParentChanged: notifyParentChangedNative });

    // when
    await wrapper.notifyParentChanged('folder-uuid-123');

    // then
    expect(notifyParentChangedNative).toHaveBeenCalledWith('folder-uuid-123');
  });

  it('when on iOS, then it resolves without invoking the native module', async () => {
    // given
    const notifyParentChangedNative = jest.fn().mockResolvedValue(undefined);
    const { wrapper } = loadWrapper('ios', { notifyParentChanged: notifyParentChangedNative });

    // when
    await expect(wrapper.notifyParentChanged('folder-uuid-123')).resolves.toBeUndefined();

    // then
    expect(notifyParentChangedNative).not.toHaveBeenCalled();
  });

  it('when the uuid is empty, then it resolves without invoking the native module', async () => {
    // given
    const notifyParentChangedNative = jest.fn().mockResolvedValue(undefined);
    const { wrapper } = loadWrapper('android', { notifyParentChanged: notifyParentChangedNative });

    // when
    await expect(wrapper.notifyParentChanged('')).resolves.toBeUndefined();

    // then
    expect(notifyParentChangedNative).not.toHaveBeenCalled();
  });

  it('when the uuid is not a string, then it resolves without invoking the native module', async () => {
    // given
    const notifyParentChangedNative = jest.fn().mockResolvedValue(undefined);
    const { wrapper } = loadWrapper('android', { notifyParentChanged: notifyParentChangedNative });

    // when
    await expect(
      wrapper.notifyParentChanged(undefined as unknown as string),
    ).resolves.toBeUndefined();

    // then
    expect(notifyParentChangedNative).not.toHaveBeenCalled();
  });

  it('when the native module is absent, then it resolves without throwing', async () => {
    // given
    const { wrapper } = loadWrapper('android', undefined);

    // when / then
    await expect(wrapper.notifyParentChanged('folder-uuid-123')).resolves.toBeUndefined();
  });
});
