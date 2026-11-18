import { NavigationContainerRef } from '@react-navigation/native';
import { act, renderHook } from '@testing-library/react-native';
import { NativeModules, Platform } from 'react-native';

import { RootStackParamList } from '../types/navigation';
import { SharedFile } from './types';
import { useAndroidShareIntent } from './useAndroidShareIntent';

jest.mock('../services/common', () => ({ logger: { error: jest.fn() } }));

const PHOTO_SIZE_BYTES = 2048;

const sharedPhoto: SharedFile = {
  uri: 'content://media/external/images/media/1',
  mimeType: 'image/jpeg',
  fileName: 'photo.jpg',
  size: PHOTO_SIZE_BYTES,
};

const createNavigationContainerRef = () =>
  ({ navigate: jest.fn() }) as unknown as NavigationContainerRef<RootStackParamList> & { navigate: jest.Mock };

describe('Reopening the share screen after signing in on Android', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    Platform.OS = 'android';
    NativeModules.ShareIntentModule = { getSharedFiles: jest.fn().mockResolvedValue(null) };
  });

  afterEach(() => {
    Platform.OS = originalPlatform;
  });

  test('when a signed-out user taps sign in from the share screen and then signs in, then the share screen opens again with the same files', async () => {
    const navigationContainerRef = createNavigationContainerRef();
    const { result, rerender } = renderHook(
      ({ isLoggedIn }: { isLoggedIn: boolean }) => useAndroidShareIntent(navigationContainerRef, isLoggedIn),
      { initialProps: { isLoggedIn: false } },
    );

    await act(async () => {
      result.current.keepFilesUntilSignIn([sharedPhoto]);
    });
    expect(navigationContainerRef.navigate).not.toHaveBeenCalled();

    await act(async () => {
      rerender({ isLoggedIn: true });
    });

    expect(navigationContainerRef.navigate).toHaveBeenCalledTimes(1);
    expect(navigationContainerRef.navigate).toHaveBeenCalledWith('AndroidShare', { files: [sharedPhoto] });
  });

  test('when a signed-out user closes the share screen, then nothing reopens after signing in', async () => {
    const navigationContainerRef = createNavigationContainerRef();
    const { rerender } = renderHook(
      ({ isLoggedIn }: { isLoggedIn: boolean }) => useAndroidShareIntent(navigationContainerRef, isLoggedIn),
      { initialProps: { isLoggedIn: false } },
    );

    await act(async () => {
      rerender({ isLoggedIn: true });
    });

    expect(navigationContainerRef.navigate).not.toHaveBeenCalled();
  });

  test('when the share screen has reopened after signing in, then it does not open again on the next sign in', async () => {
    const navigationContainerRef = createNavigationContainerRef();
    const { result, rerender } = renderHook(
      ({ isLoggedIn }: { isLoggedIn: boolean }) => useAndroidShareIntent(navigationContainerRef, isLoggedIn),
      { initialProps: { isLoggedIn: false } },
    );

    await act(async () => {
      result.current.keepFilesUntilSignIn([sharedPhoto]);
    });
    await act(async () => {
      rerender({ isLoggedIn: true });
    });
    await act(async () => {
      rerender({ isLoggedIn: false });
    });
    await act(async () => {
      rerender({ isLoggedIn: true });
    });

    expect(navigationContainerRef.navigate).toHaveBeenCalledTimes(1);
  });
});
