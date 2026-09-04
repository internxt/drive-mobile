import { imageService } from '@internxt-mobile/services/common';
import errorService from '@internxt-mobile/services/ErrorService';
import { fs } from '@internxt-mobile/services/FileSystemService';
import { renderHook, waitFor } from '@testing-library/react-native';
import { useAppSelector } from '../store/hooks';
import { useProfileAvatar } from './useProfileAvatar';

jest.mock('../store/hooks', () => ({
  useAppSelector: jest.fn(),
}));

jest.mock('@internxt-mobile/services/common', () => ({
  imageService: {
    getCachedImage: jest.fn(),
  },
  PROFILE_PICTURE_CACHE_KEY: 'profile_picture',
}));

jest.mock('@internxt-mobile/services/ErrorService', () => ({
  __esModule: true,
  default: { reportError: jest.fn() },
}));

jest.mock('@internxt-mobile/services/FileSystemService', () => ({
  fs: { pathToUri: jest.fn((path: string) => `file://${path}`) },
}));

const mockUseAppSelector = useAppSelector as jest.Mock;
const mockGetCachedImage = imageService.getCachedImage as jest.Mock;
const mockPathToUri = fs.pathToUri as jest.Mock;
const mockReportError = errorService.reportError as jest.Mock;

const setupUser = (avatar: string | null | undefined) => {
  mockUseAppSelector.mockImplementation((selector: (s: { auth: { user: unknown } }) => unknown) =>
    selector({ auth: { user: avatar !== undefined ? { avatar } : undefined } }),
  );
};

const CACHE_KEY = 'profile_picture';
const AVATAR_URL = 'https://example.com/avatar.jpg';
const CACHED_PATH = '/cache/avatar.jpg';
const CACHED_URI = 'file:///cache/avatar.jpg';

describe('useProfileAvatar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathToUri.mockImplementation((path: string) => `file://${path}`);
  });

  describe('when user has no avatar', () => {
    it('returns undefined when user is undefined', async () => {
      setupUser(undefined);

      const { result } = renderHook(() => useProfileAvatar());

      expect(result.current).toBeUndefined();
      expect(mockGetCachedImage).not.toHaveBeenCalled();
    });

    it('returns undefined when user.avatar is null', async () => {
      setupUser(null);

      const { result } = renderHook(() => useProfileAvatar());

      expect(result.current).toBeUndefined();
      expect(mockGetCachedImage).not.toHaveBeenCalled();
    });

    it('returns undefined when user.avatar is empty string', async () => {
      setupUser('');

      const { result } = renderHook(() => useProfileAvatar());

      expect(result.current).toBeUndefined();
      expect(mockGetCachedImage).not.toHaveBeenCalled();
    });
  });

  describe('when user has an avatar', () => {
    it('returns cached URI when a local cache hit exists', async () => {
      setupUser(AVATAR_URL);
      mockGetCachedImage.mockResolvedValue(CACHED_PATH);

      const { result } = renderHook(() => useProfileAvatar());

      await waitFor(() => expect(result.current).toBe(CACHED_URI));

      expect(mockGetCachedImage).toHaveBeenCalledWith(CACHE_KEY);
      expect(mockPathToUri).toHaveBeenCalledWith(CACHED_PATH);
    });

    it('returns remote avatar URL when there is no cache hit', async () => {
      setupUser(AVATAR_URL);
      mockGetCachedImage.mockResolvedValue(null);

      const { result } = renderHook(() => useProfileAvatar());

      await waitFor(() => expect(result.current).toBe(AVATAR_URL));

      expect(mockGetCachedImage).toHaveBeenCalledWith(CACHE_KEY);
      expect(mockPathToUri).not.toHaveBeenCalled();
    });

    it('falls back to remote avatar URL when getCachedImage rejects', async () => {
      setupUser(AVATAR_URL);
      const error = new Error('cache read failed');
      mockGetCachedImage.mockRejectedValue(error);

      const { result } = renderHook(() => useProfileAvatar());

      await waitFor(() => expect(result.current).toBe(AVATAR_URL));

      expect(mockReportError).toHaveBeenCalledWith(error);
    });

    it('reports the error via errorService on cache failure', async () => {
      setupUser(AVATAR_URL);
      const error = new Error('disk error');
      mockGetCachedImage.mockRejectedValue(error);

      renderHook(() => useProfileAvatar());

      await waitFor(() => expect(mockReportError).toHaveBeenCalledWith(error));
    });
  });
});
