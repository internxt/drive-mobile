import { act, renderHook, waitFor } from '@testing-library/react-native';
import { CaptureProtection } from 'react-native-capture-protection';
import asyncStorageService from '../services/AsyncStorageService';
import { logger } from '../services/common';
import { useScreenProtection } from './useScreenProtection';

jest.mock('react-native-capture-protection', () => ({
  CaptureProtection: {
    prevent: jest.fn(),
    allow: jest.fn(),
  },
}));

jest.mock('../services/AsyncStorageService', () => ({
  getScreenProtectionEnabled: jest.fn(),
  saveScreenProtectionEnabled: jest.fn(),
}));

jest.mock('../services/common', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('useScreenProtection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with protection enabled when saved preference is true', async () => {
      (asyncStorageService.getScreenProtectionEnabled as jest.Mock).mockResolvedValue(true);

      const { result } = renderHook(() => useScreenProtection());

      expect(result.current.isInitialized).toBe(false);

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(result.current.isEnabled).toBe(true);
      expect(CaptureProtection.prevent).toHaveBeenCalledTimes(1);
      expect(CaptureProtection.allow).not.toHaveBeenCalled();
      expect(asyncStorageService.getScreenProtectionEnabled).toHaveBeenCalledTimes(1);
    });

    it('should initialize with protection disabled when saved preference is false', async () => {
      (asyncStorageService.getScreenProtectionEnabled as jest.Mock).mockResolvedValue(false);

      const { result } = renderHook(() => useScreenProtection());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(result.current.isEnabled).toBe(false);
      expect(CaptureProtection.allow).toHaveBeenCalledTimes(1);
      expect(CaptureProtection.prevent).not.toHaveBeenCalled();
    });

    it('should default to enabled on initialization error', async () => {
      const error = new Error('Storage error');
      (asyncStorageService.getScreenProtectionEnabled as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useScreenProtection());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(result.current.isEnabled).toBe(true);
      expect(CaptureProtection.prevent).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith('Error initializing screen protection:', error);
    });
  });

  describe('setScreenProtection', () => {
    beforeEach(async () => {
      (asyncStorageService.getScreenProtectionEnabled as jest.Mock).mockResolvedValue(false);
    });

    it('should enable screen protection when called with true', async () => {
      (asyncStorageService.saveScreenProtectionEnabled as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useScreenProtection());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      await act(async () => {
        await result.current.setScreenProtection(true);
      });

      expect(result.current.isEnabled).toBe(true);
      expect(CaptureProtection.prevent).toHaveBeenCalled();
      expect(asyncStorageService.saveScreenProtectionEnabled).toHaveBeenCalledWith(true);
    });

    it('should disable screen protection when called with false', async () => {
      (asyncStorageService.getScreenProtectionEnabled as jest.Mock).mockResolvedValue(true);
      (asyncStorageService.saveScreenProtectionEnabled as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useScreenProtection());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      await act(async () => {
        await result.current.setScreenProtection(false);
      });

      expect(result.current.isEnabled).toBe(false);
      expect(CaptureProtection.allow).toHaveBeenCalled();
      expect(asyncStorageService.saveScreenProtectionEnabled).toHaveBeenCalledWith(false);
    });

    it('should revert to enabled and throw error on failure', async () => {
      const error = new Error('CaptureProtection error');
      (asyncStorageService.getScreenProtectionEnabled as jest.Mock).mockResolvedValue(false);
      (CaptureProtection.allow as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useScreenProtection());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      await expect(
        act(async () => {
          await result.current.setScreenProtection(false);
        }),
      ).rejects.toThrow(error);

      expect(result.current.isEnabled).toBe(true);
      expect(CaptureProtection.prevent).toHaveBeenCalled();
      expect(asyncStorageService.saveScreenProtectionEnabled).toHaveBeenCalledWith(true);
      expect(logger.error).toHaveBeenCalledWith('Error setting screen protection:', error);
    });

    it('should save preference after successfully changing protection state', async () => {
      (asyncStorageService.getScreenProtectionEnabled as jest.Mock).mockResolvedValue(true);
      (asyncStorageService.saveScreenProtectionEnabled as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useScreenProtection());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      await act(async () => {
        await result.current.setScreenProtection(false);
      });

      expect(asyncStorageService.saveScreenProtectionEnabled).toHaveBeenCalledWith(false);

      await act(async () => {
        await result.current.setScreenProtection(true);
      });

      expect(asyncStorageService.saveScreenProtectionEnabled).toHaveBeenCalledWith(true);
    });
  });

  describe('security defaults', () => {
    it('should default to enabled for security if no preference is saved', async () => {
      (asyncStorageService.getScreenProtectionEnabled as jest.Mock).mockResolvedValue(true);

      const { result } = renderHook(() => useScreenProtection());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(result.current.isEnabled).toBe(true);
      expect(CaptureProtection.prevent).toHaveBeenCalled();
    });

    it('should enable protection on error for security', async () => {
      (asyncStorageService.getScreenProtectionEnabled as jest.Mock).mockRejectedValue(new Error('Storage unavailable'));

      const { result } = renderHook(() => useScreenProtection());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(result.current.isEnabled).toBe(true);
      expect(CaptureProtection.prevent).toHaveBeenCalled();
    });
  });
});
