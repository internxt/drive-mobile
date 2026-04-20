import * as MediaLibrary from 'expo-media-library';
import { photoPermissionService } from './photoPermissionService';

jest.mock('expo-media-library');

const mockMediaLibrary = MediaLibrary as jest.Mocked<typeof MediaLibrary>;

describe('PhotoPermissionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('when getStatus is called and iOS accessPrivileges is all, then returns granted', async () => {
    mockMediaLibrary.getPermissionsAsync.mockResolvedValueOnce({
      status: 'granted' as MediaLibrary.PermissionStatus,
      accessPrivileges: 'all',
      granted: true,
      canAskAgain: true,
      expires: 'never',
    });

    expect(await photoPermissionService.getStatus()).toBe('granted');
  });

  it('when getStatus is called and iOS accessPrivileges is limited, then returns limited', async () => {
    mockMediaLibrary.getPermissionsAsync.mockResolvedValueOnce({
      status: 'granted' as MediaLibrary.PermissionStatus,
      accessPrivileges: 'limited',
      granted: true,
      canAskAgain: true,
      expires: 'never',
    });

    expect(await photoPermissionService.getStatus()).toBe('limited');
  });

  it('when getStatus is called on Android with status granted, then returns granted', async () => {
    mockMediaLibrary.getPermissionsAsync.mockResolvedValueOnce({
      status: 'granted' as MediaLibrary.PermissionStatus,
      granted: true,
      canAskAgain: true,
      expires: 'never',
    } as unknown as MediaLibrary.PermissionResponse);

    expect(await photoPermissionService.getStatus()).toBe('granted');
  });

  it('when getStatus is called and status is denied, then returns denied', async () => {
    mockMediaLibrary.getPermissionsAsync.mockResolvedValueOnce({
      status: 'denied' as MediaLibrary.PermissionStatus,
      granted: false,
      canAskAgain: false,
      expires: 'never',
    } as unknown as MediaLibrary.PermissionResponse);

    expect(await photoPermissionService.getStatus()).toBe('denied');
  });

  it('when getStatus is called and status is undetermined, then returns undetermined', async () => {
    mockMediaLibrary.getPermissionsAsync.mockResolvedValueOnce({
      status: 'undetermined' as MediaLibrary.PermissionStatus,
      granted: false,
      canAskAgain: true,
      expires: 'never',
    } as unknown as MediaLibrary.PermissionResponse);

    expect(await photoPermissionService.getStatus()).toBe('undetermined');
  });

  it('when getStatus is called on iOS with accessPrivileges none, then returns denied', async () => {
    mockMediaLibrary.getPermissionsAsync.mockResolvedValueOnce({
      status: 'denied' as MediaLibrary.PermissionStatus,
      accessPrivileges: 'none',
      granted: false,
      canAskAgain: false,
      expires: 'never',
    });

    expect(await photoPermissionService.getStatus()).toBe('denied');
  });

  it('when requestPermission is called and user allows on Android, then returns granted', async () => {
    mockMediaLibrary.requestPermissionsAsync.mockResolvedValueOnce({
      status: 'granted' as MediaLibrary.PermissionStatus,
      granted: true,
      canAskAgain: true,
      expires: 'never',
    } as unknown as MediaLibrary.PermissionResponse);

    expect(await photoPermissionService.requestPermission()).toBe('granted');
  });

  it('when requestPermission is called and user allows, then returns granted', async () => {
    mockMediaLibrary.requestPermissionsAsync.mockResolvedValueOnce({
      status: 'granted' as MediaLibrary.PermissionStatus,
      accessPrivileges: 'all',
      granted: true,
      canAskAgain: true,
      expires: 'never',
    });

    expect(await photoPermissionService.requestPermission()).toBe('granted');
  });

  it('when requestPermission is called and user grants limited access on iOS, then returns limited', async () => {
    mockMediaLibrary.requestPermissionsAsync.mockResolvedValueOnce({
      status: 'granted' as MediaLibrary.PermissionStatus,
      accessPrivileges: 'limited',
      granted: true,
      canAskAgain: true,
      expires: 'never',
    });

    expect(await photoPermissionService.requestPermission()).toBe('limited');
  });

  it('when requestPermission is called and user denies, then returns denied', async () => {
    mockMediaLibrary.requestPermissionsAsync.mockResolvedValueOnce({
      status: 'denied' as MediaLibrary.PermissionStatus,
      granted: false,
      canAskAgain: false,
      expires: 'never',
    } as unknown as MediaLibrary.PermissionResponse);

    expect(await photoPermissionService.requestPermission()).toBe('denied');
  });
});
