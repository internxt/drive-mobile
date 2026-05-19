import uuid from 'react-native-uuid';
import secureStorageService from 'src/services/SecureStorageService';
import { AsyncStorageKey } from 'src/types';

export const PhotoDeviceId = {
  async getOrCreate(): Promise<string> {
    const existing = await secureStorageService.getItem(AsyncStorageKey.PhotosDeviceId);
    if (existing) return existing;

    const id = uuid.v4() as string;
    await secureStorageService.setItem(AsyncStorageKey.PhotosDeviceId, id);
    return id;
  },
};
