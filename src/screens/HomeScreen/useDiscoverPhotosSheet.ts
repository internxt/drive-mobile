import * as useCases from '@internxt-mobile/useCases/drive';
import { useCallback, useEffect, useState } from 'react';
import asyncStorageService from '../../services/AsyncStorageService';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { enableBackupThunk } from '../../store/slices/photos';
import { AsyncStorageKey } from '../../types';

export const useDiscoverPhotosSheet = (onNavigateToPhotos: () => void) => {
  const [isOpen, setIsOpen] = useState(false);
  const dispatch = useAppDispatch();
  const photosEnabled = useAppSelector((state) => state.photos.enabled);

  const openDiscoverPhotosSheet = useCallback(async () => {
    if (photosEnabled) {
      return;
    }
    const seen = await asyncStorageService.getItem(AsyncStorageKey.PhotosDiscoverSeen);
    if (!seen) {
      setIsOpen(true);
    }
  }, [photosEnabled]);

  const onDismiss = useCallback(async () => {
    await asyncStorageService.saveItem(AsyncStorageKey.PhotosDiscoverSeen, 'true');
    setIsOpen(false);
  }, []);

  const onStartPhotos = useCallback(async () => {
    await onDismiss();
    onNavigateToPhotos();
    dispatch(enableBackupThunk());
  }, [onDismiss, onNavigateToPhotos, dispatch]);

  useEffect(() => {
    return useCases.onDriveItemUploaded(openDiscoverPhotosSheet);
  }, [openDiscoverPhotosSheet]);

  return { isOpen, onDismiss, onStartPhotos };
};
