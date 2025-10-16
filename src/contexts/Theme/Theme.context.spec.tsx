jest.mock('@internxt-mobile/services/AsyncStorageService');
jest.mock('@internxt-mobile/services/common');

import asyncStorageService from '@internxt-mobile/services/AsyncStorageService';
import { logger } from '@internxt-mobile/services/common';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import { ThemeProvider, useTheme } from './Theme.context';

type AppearanceListener = (preferences: { colorScheme: ColorSchemeName }) => void;

describe('Theme.context', () => {
  const mockGetThemePreference = asyncStorageService.getThemePreference as jest.Mock;
  const mockSaveThemePreference = asyncStorageService.saveThemePreference as jest.Mock;

  const wrapper = ({ children }: { children: React.ReactNode }) => <ThemeProvider>{children}</ThemeProvider>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
    jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => undefined);
    jest.spyOn(Appearance, 'addChangeListener').mockReturnValue({ remove: jest.fn() });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('useTheme hook', () => {
    it('should throw error when used outside ThemeProvider', () => {
      // Suppress console.error for this test since we expect an error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

      expect(() => renderHook(() => useTheme())).toThrow('useTheme must be used within a ThemeProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('initialization', () => {
    it('should initialize with saved theme preference', async () => {
      mockGetThemePreference.mockResolvedValue('dark');

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.isInitialized).toBe(false);

      // Fast-forward timers to complete initialization
      await act(async () => {
        await Promise.resolve();
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(result.current.theme).toBe('dark');
      expect(Appearance.setColorScheme).toHaveBeenCalledWith('dark');
      expect(mockGetThemePreference).toHaveBeenCalledTimes(1);
    });

    it('should initialize with system theme when no saved preference', async () => {
      mockGetThemePreference.mockResolvedValue(null);
      jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark');

      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await Promise.resolve();
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(result.current.theme).toBe('dark');
      expect(Appearance.setColorScheme).toHaveBeenCalledWith('dark');
    });

    it('should default to light theme when no preference and no system theme', async () => {
      mockGetThemePreference.mockResolvedValue(null);
      jest.spyOn(Appearance, 'getColorScheme').mockReturnValue(null);

      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await Promise.resolve();
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(result.current.theme).toBe('light');
      expect(Appearance.setColorScheme).toHaveBeenCalledWith('light');
    });

    it('should handle initialization error gracefully and use light fallback theme', async () => {
      const error = new Error('Storage error');
      mockGetThemePreference.mockRejectedValue(error);

      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
      expect(result.current.theme).toBe('light');
      expect(result.current.isInitialized).toBe(true);
      expect(logger.error).toHaveBeenCalledWith('Error loading theme preference:', error);
    });

    it('should setup theme change listener during initialization', async () => {
      mockGetThemePreference.mockResolvedValue('light');

      renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await Promise.resolve();
      });

      expect(Appearance.addChangeListener).toHaveBeenCalledTimes(1);
      expect(Appearance.addChangeListener).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('setTheme', () => {
    it('should update theme and save preference', async () => {
      mockGetThemePreference.mockResolvedValue('light');
      mockSaveThemePreference.mockResolvedValue(undefined);

      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await Promise.resolve();
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      await act(async () => {
        await result.current.setTheme('dark');
      });

      expect(result.current.theme).toBe('dark');
      expect(mockSaveThemePreference).toHaveBeenCalledWith('dark');
      expect(Appearance.setColorScheme).toHaveBeenCalledWith('dark');
    });

    it('should handle errors when saving theme preference', async () => {
      const error = new Error('Save error');
      mockGetThemePreference.mockResolvedValue('light');
      mockSaveThemePreference.mockRejectedValue(error);

      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await Promise.resolve();
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      await act(async () => {
        await result.current.setTheme('dark');
      });

      expect(logger.error).toHaveBeenCalledWith('Error saving theme preference:', error);
      // Theme should still be updated in state
      expect(result.current.theme).toBe('dark');
    });

    it('should switch between themes correctly', async () => {
      mockGetThemePreference.mockResolvedValue('light');
      mockSaveThemePreference.mockResolvedValue(undefined);

      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await Promise.resolve();
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Change to dark
      await act(async () => {
        await result.current.setTheme('dark');
      });

      expect(result.current.theme).toBe('dark');

      // Change back to light
      await act(async () => {
        await result.current.setTheme('light');
      });

      expect(result.current.theme).toBe('light');
      expect(mockSaveThemePreference).toHaveBeenCalledTimes(2);
    });
  });

  describe('system theme changes', () => {
    it('should apply system theme changes when no saved preference exists', async () => {
      let changeListener: AppearanceListener | null = null;

      mockGetThemePreference.mockResolvedValue(null);
      jest.spyOn(Appearance, 'addChangeListener').mockImplementation((callback) => {
        changeListener = callback;
        return { remove: jest.fn() };
      });

      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await Promise.resolve();
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Simulate system theme change
      await act(async () => {
        changeListener?.({ colorScheme: 'dark' });
        await Promise.resolve();
      });

      expect(result.current.theme).toBe('dark');
      expect(Appearance.setColorScheme).toHaveBeenCalledWith('dark');
    });

    it('should ignore system theme changes when user has saved preference', async () => {
      let changeListener: AppearanceListener | null = null;

      mockGetThemePreference.mockResolvedValue('light');
      jest.spyOn(Appearance, 'addChangeListener').mockImplementation((callback) => {
        changeListener = callback;
        return { remove: jest.fn() };
      });

      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await Promise.resolve();
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      const setColorSchemeCallsBefore = (Appearance.setColorScheme as jest.Mock).mock.calls.length;

      // Simulate system theme change
      await act(async () => {
        changeListener?.({ colorScheme: 'dark' });
        await Promise.resolve();
      });

      // Theme should NOT change
      expect(result.current.theme).toBe('light');
      // SetColorScheme should not be called again
      expect((Appearance.setColorScheme as jest.Mock).mock.calls.length).toBe(setColorSchemeCallsBefore);
    });

    it('should ignore system theme changes during initialization', async () => {
      let changeListener: AppearanceListener | null = null;

      mockGetThemePreference.mockResolvedValue('light');
      jest.spyOn(Appearance, 'addChangeListener').mockImplementation((callback) => {
        changeListener = callback;
        return { remove: jest.fn() };
      });

      renderHook(() => useTheme(), { wrapper });

      // Trigger change BEFORE initialization completes
      await act(async () => {
        await Promise.resolve();
        changeListener?.({ colorScheme: 'dark' });
      });

      expect(logger.info).toHaveBeenCalledWith('Ignoring theme change event during initialization');
    });

    it('should ignore system theme changes triggered by manual theme change', async () => {
      let changeListener: AppearanceListener | null = null;

      mockGetThemePreference.mockResolvedValue(null);
      mockSaveThemePreference.mockResolvedValue(undefined);
      jest.spyOn(Appearance, 'addChangeListener').mockImplementation((callback) => {
        changeListener = callback;
        return { remove: jest.fn() };
      });

      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await Promise.resolve();
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Manually change theme
      await act(async () => {
        await result.current.setTheme('dark');
        // Simulate listener being triggered by our own setColorScheme
        changeListener?.({ colorScheme: 'dark' });
        await Promise.resolve();
      });

      expect(logger.info).toHaveBeenCalledWith('Ignoring theme change event triggered by manual theme change');
    });
  });

  describe('cleanup', () => {
    it('should remove listener on unmount', async () => {
      const removeMock = jest.fn();
      mockGetThemePreference.mockResolvedValue('light');
      jest.spyOn(Appearance, 'addChangeListener').mockReturnValue({ remove: removeMock });

      const { unmount } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await Promise.resolve();
      });

      unmount();

      expect(removeMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('context value memoization', () => {
    it('should memoize context value when dependencies do not change', async () => {
      mockGetThemePreference.mockResolvedValue('light');

      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await Promise.resolve();
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Verify that the context value has the expected structure
      expect(result.current).toEqual({
        theme: 'light',
        setTheme: expect.any(Function),
        isInitialized: true,
      });

      // The values should remain stable across reads
      expect(result.current.theme).toBe('light');
      expect(result.current.isInitialized).toBe(true);
    });

    it('should recreate context value when theme changes', async () => {
      mockGetThemePreference.mockResolvedValue('light');
      mockSaveThemePreference.mockResolvedValue(undefined);

      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await Promise.resolve();
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      const firstValue = result.current;

      // Change theme
      await act(async () => {
        await result.current.setTheme('dark');
      });

      // Should be a different object reference
      expect(result.current).not.toBe(firstValue);
      expect(result.current.theme).toBe('dark');
    });
  });
});
