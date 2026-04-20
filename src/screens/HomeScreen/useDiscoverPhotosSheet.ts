import * as useCases from '@internxt-mobile/useCases/drive';
import { useCallback, useEffect, useState } from 'react';
import asyncStorageService from '../../services/AsyncStorageService';
import { useAppSelector } from '../../store/hooks';
import { AsyncStorageKey } from '../../types';

export const useDiscoverPhotosSheet = (onNavigateToPhotos: () => void) => {
  const [isOpen, setIsOpen] = useState(false);
  const photosEnabled = useAppSelector((state) => state.photos.enabled);

  const openDiscoverPhotosSheet = useCallback(async () => {
    if (photosEnabled) return;
    const seen = await asyncStorageService.getItem(AsyncStorageKey.PhotosDiscoverSeen);
    if (!seen) setIsOpen(true);
  }, [photosEnabled]);

  const onDismiss = useCallback(async () => {
    await asyncStorageService.saveItem(AsyncStorageKey.PhotosDiscoverSeen, 'true');
    setIsOpen(false);
  }, []);

  const onStartPhotos = useCallback(async () => {
    await onDismiss();
    onNavigateToPhotos();
  }, [onDismiss, onNavigateToPhotos]);

  useEffect(() => {
    return useCases.onDriveItemUploaded(openDiscoverPhotosSheet);
  }, [openDiscoverPhotosSheet]);

  return { isOpen, onDismiss, onStartPhotos };
};
