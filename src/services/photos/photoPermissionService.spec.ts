import * as MediaLibrary from 'expo-media-library';
import { photoPermissionService } from './photoPermissionService';

jest.mock('expo-media-library');

const mockMediaLibrary = MediaLibrary as jest.Mocked<typeof MediaLibrary>;

const makeResponse = (overrides: Partial<MediaLibrary.PermissionResponse>): MediaLibrary.PermissionResponse => ({
  status: 'undetermined' as MediaLibrary.PermissionStatus,
  granted: false,
  canAskAgain: true,
  expires: 'never',
  ...overrides,
});

describe('PhotoPermissionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getStatus', () => {
    test('when iOS accessPrivileges is all, then returns granted', async () => {
      mockMediaLibrary.getPermissionsAsync.mockResolvedValueOnce(
        makeResponse({ status: 'granted' as MediaLibrary.PermissionStatus, accessPrivileges: 'all', granted: true }),
      );

      expect(await photoPermissionService.getStatus()).toBe('granted');
    });

    test('when iOS accessPrivileges is limited, then returns limited', async () => {
      mockMediaLibrary.getPermissionsAsync.mockResolvedValueOnce(
        makeResponse({ status: 'granted' as MediaLibrary.PermissionStatus, accessPrivileges: 'limited', granted: true }),
      );

      expect(await photoPermissionService.getStatus()).toBe('limited');
    });

    test('when iOS accessPrivileges is none, then returns denied', async () => {
      mockMediaLibrary.getPermissionsAsync.mockResolvedValueOnce(
        makeResponse({ status: 'denied' as MediaLibrary.PermissionStatus, accessPrivileges: 'none', granted: false }),
      );

      expect(await photoPermissionService.getStatus()).toBe('denied');
    });

    test('when iOS accessPrivileges is all but status is denied, then accessPrivileges takes precedence and returns granted', async () => {
      mockMediaLibrary.getPermissionsAsync.mockResolvedValueOnce(
        makeResponse({ status: 'denied' as MediaLibrary.PermissionStatus, accessPrivileges: 'all', granted: false }),
      );

      expect(await photoPermissionService.getStatus()).toBe('granted');
    });

    test('when Android status is granted with no accessPrivileges, then returns granted', async () => {
      mockMediaLibrary.getPermissionsAsync.mockResolvedValueOnce(
        makeResponse({ status: 'granted' as MediaLibrary.PermissionStatus, granted: true }),
      );

      expect(await photoPermissionService.getStatus()).toBe('granted');
    });

    test('when status is denied, then returns denied', async () => {
      mockMediaLibrary.getPermissionsAsync.mockResolvedValueOnce(
        makeResponse({ status: 'denied' as MediaLibrary.PermissionStatus, canAskAgain: false }),
      );

      expect(await photoPermissionService.getStatus()).toBe('denied');
    });

    test('when status is undetermined, then returns undetermined', async () => {
      mockMediaLibrary.getPermissionsAsync.mockResolvedValueOnce(makeResponse({}));

      expect(await photoPermissionService.getStatus()).toBe('undetermined');
    });
  });

  describe('requestPermission', () => {
    test('when iOS user grants full access, then returns granted', async () => {
      mockMediaLibrary.requestPermissionsAsync.mockResolvedValueOnce(
        makeResponse({ status: 'granted' as MediaLibrary.PermissionStatus, accessPrivileges: 'all', granted: true }),
      );

      expect(await photoPermissionService.requestPermission()).toBe('granted');
    });

    test('when iOS user grants limited access, then returns limited', async () => {
      mockMediaLibrary.requestPermissionsAsync.mockResolvedValueOnce(
        makeResponse({ status: 'granted' as MediaLibrary.PermissionStatus, accessPrivileges: 'limited', granted: true }),
      );

      expect(await photoPermissionService.requestPermission()).toBe('limited');
    });

    test('when iOS user revokes access, then returns denied', async () => {
      mockMediaLibrary.requestPermissionsAsync.mockResolvedValueOnce(
        makeResponse({ status: 'denied' as MediaLibrary.PermissionStatus, accessPrivileges: 'none', granted: false }),
      );

      expect(await photoPermissionService.requestPermission()).toBe('denied');
    });

    test('when Android user allows, then returns granted', async () => {
      mockMediaLibrary.requestPermissionsAsync.mockResolvedValueOnce(
        makeResponse({ status: 'granted' as MediaLibrary.PermissionStatus, granted: true }),
      );

      expect(await photoPermissionService.requestPermission()).toBe('granted');
    });

    test('when user denies, then returns denied', async () => {
      mockMediaLibrary.requestPermissionsAsync.mockResolvedValueOnce(
        makeResponse({ status: 'denied' as MediaLibrary.PermissionStatus, canAskAgain: false }),
      );

      expect(await photoPermissionService.requestPermission()).toBe('denied');
    });
  });
});
