import { useCallback, useEffect, useState } from 'react';
import asyncStorageService from 'src/services/AsyncStorageService';
import { logger } from 'src/services/common';
import { photosDeviceService } from 'src/services/photos/photosDeviceService';
import { useAppSelector } from 'src/store/hooks';
import { AsyncStorageKey } from 'src/types';

export interface PhotoDeviceOption {
  uuid: string;
  name: string;
}

export interface PhotoDevicesResult {
  devices: PhotoDeviceOption[];
  currentDeviceId: string | null;
  isLoading: boolean;
  reload: () => Promise<void>;
}

const sortAlphabetically = (devices: PhotoDeviceOption[]): PhotoDeviceOption[] =>
  [...devices].sort((a, b) => a.name.localeCompare(b.name));

/**
 * Lists the devices registered for Photos backup.
 */
export const usePhotoDevices = (): PhotoDevicesResult => {
  const currentDeviceId = useAppSelector((state) => state.photos.deviceId);
  const [devices, setDevices] = useState<PhotoDeviceOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const allDevices = await photosDeviceService.listDevices();
      const options = sortAlphabetically(
        allDevices
          .filter((device) => device.status === 'EXISTS')
          .map((device) => ({ uuid: device.uuid, name: device.plainName })),
      );
      setDevices(options);
      await asyncStorageService.saveItem(AsyncStorageKey.PhotosDevicesCache, JSON.stringify(options));
    } catch (error) {
      logger.error('[usePhotoDevices] Failed to list devices', { error });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadCached = async () => {
      const cached = await asyncStorageService.getItem(AsyncStorageKey.PhotosDevicesCache);
      if (!cached) return;
      try {
        const parsed = JSON.parse(cached) as PhotoDeviceOption[];
        setDevices(sortAlphabetically(parsed));
      } catch (error) {
        logger.warn('[usePhotoDevices] Failed to parse cached devices', { error });
      }
    };
    loadCached();
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { devices, currentDeviceId, isLoading, reload };
};
