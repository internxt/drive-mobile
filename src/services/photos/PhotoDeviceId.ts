import uuid from 'react-native-uuid';
import asyncStorageService from 'src/services/AsyncStorageService';
import { AsyncStorageKey } from 'src/types';

export const PhotoDeviceId = {
  async getOrCreate(): Promise<string> {
    const existing = await asyncStorageService.getItem(AsyncStorageKey.PhotosDeviceId);
    if (existing) return existing;

    const id = uuid.v4() as string;
    await asyncStorageService.saveItem(AsyncStorageKey.PhotosDeviceId, id);
    return id;
  },
};
