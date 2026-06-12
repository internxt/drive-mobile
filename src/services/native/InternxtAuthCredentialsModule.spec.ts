type Wrapper = typeof import('./InternxtAuthCredentialsModule');
type Credentials = import('./InternxtAuthCredentialsModule').InternxtAuthCredentials;

const credentials: Credentials = {
  bearerToken: 'token-abc',
  userId: 'user-1',
  bridgeUser: 'bridge@internxt.com',
  mnemonic: 'pretty cloud secret words',
  rootFolderUuid: 'root-uuid-123',
  email: 'user@internxt.com',
  driveBaseUrl: 'https://drive.example',
  bridgeBaseUrl: 'https://bridge.example',
  desktopToken: 'desktop-token',
};

const loadWrapper = (platformOS: 'android' | 'ios', nativeModule: unknown): Wrapper => {
  let wrapper!: Wrapper;
  jest.isolateModules(() => {
    jest.doMock('react-native', () => ({
      Platform: { OS: platformOS },
      NativeModules: nativeModule === undefined ? {} : { InternxtAuthCredentialsModule: nativeModule },
    }));
    wrapper = require('./InternxtAuthCredentialsModule');
  });
  return wrapper;
};

const arrangePresentNative = (platformOS: 'android' | 'ios') => {
  const setCredentials = jest.fn().mockResolvedValue(undefined);
  const clearCredentials = jest.fn().mockResolvedValue(undefined);
  const wrapper = loadWrapper(platformOS, { setCredentials, clearCredentials });
  return { wrapper, setCredentials, clearCredentials };
};

describe('InternxtAuthCredentialsModule wrapper', () => {
  afterEach(() => {
    jest.resetModules();
  });

  test('when on iOS with the module present, then setCredentials delegates with the credentials', async () => {
    const { wrapper, setCredentials } = arrangePresentNative('ios');

    await wrapper.setCredentials(credentials);

    expect(setCredentials).toHaveBeenCalledWith(credentials);
  });

  test('when on iOS with the module present, then setCredentials forwards driveBaseUrl to the native module', async () => {
    const { wrapper, setCredentials } = arrangePresentNative('ios');

    await wrapper.setCredentials(credentials);

    expect(setCredentials.mock.calls[0][0]).toMatchObject({ driveBaseUrl: 'https://drive.example' });
  });

  test('when on iOS with the module present, then setCredentials forwards bridgeBaseUrl to the native module', async () => {
    const { wrapper, setCredentials } = arrangePresentNative('ios');

    await wrapper.setCredentials(credentials);

    expect(setCredentials.mock.calls[0][0]).toMatchObject({ bridgeBaseUrl: 'https://bridge.example' });
  });

  test('when on iOS with the module present, then clearCredentials delegates to the native module', async () => {
    const { wrapper, clearCredentials } = arrangePresentNative('ios');

    await wrapper.clearCredentials();

    expect(clearCredentials).toHaveBeenCalledTimes(1);
  });

  test('when on Android with the module present, then setCredentials delegates with the credentials', async () => {
    const { wrapper, setCredentials } = arrangePresentNative('android');

    await wrapper.setCredentials(credentials);

    expect(setCredentials).toHaveBeenCalledWith(credentials);
  });

  test('when the native module is absent, then setCredentials resolves without throwing', async () => {
    const wrapper = loadWrapper('ios', undefined);

    await expect(wrapper.setCredentials(credentials)).resolves.toBeUndefined();
  });

  test('when the native module is absent, then clearCredentials resolves without throwing', async () => {
    const wrapper = loadWrapper('ios', undefined);

    await expect(wrapper.clearCredentials()).resolves.toBeUndefined();
  });
});
