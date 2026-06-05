import * as MediaLibrary from 'expo-media-library';
import { useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { photosActions, runBackupCycleThunk } from 'src/store/slices/photos';
import { photoPermissionService } from '../../../services/photos/photoPermissionService';
import { useAppDispatch } from '../../../store/hooks';

const PICKER_TIMEOUT_MS = 3 * 60 * 1000;

/**
 * Returns a callback that opens the system photo-selection picker so the user
 * can expand their limited photo access, then reloads the timeline and starts
 * a backup cycle.
 *
 * @param reloadLocal - Reloads the local asset list after the selection changes.
 * @returns Async callback to invoke on "Select more photos" press.
 */
const useSelectMorePhotos = (reloadLocal: () => Promise<void>): (() => Promise<void>) => {
  const dispatch = useAppDispatch();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listenerRef = useRef<ReturnType<typeof MediaLibrary.addListener> | null>(null);

  return useCallback(async () => {
    if (Platform.OS === 'android') {
      await MediaLibrary.requestPermissionsAsync();
      const newStatus = await photoPermissionService.getStatus();
      dispatch(photosActions.setPermissionStatus(newStatus));
      await reloadLocal();
      dispatch(runBackupCycleThunk());
      return;
    }

    const cleanup = () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      listenerRef.current?.remove();
      listenerRef.current = null;
    };

    cleanup();

    listenerRef.current = MediaLibrary.addListener(async () => {
      cleanup();
      const newStatus = await photoPermissionService.getStatus();
      dispatch(photosActions.setPermissionStatus(newStatus));
      await reloadLocal();
      dispatch(runBackupCycleThunk());
    });

    timeoutRef.current = setTimeout(cleanup, PICKER_TIMEOUT_MS);

    await MediaLibrary.presentPermissionsPickerAsync();
  }, [dispatch, reloadLocal]);
};

export default useSelectMorePhotos;
