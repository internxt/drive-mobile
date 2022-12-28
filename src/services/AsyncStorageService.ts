import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AsyncStorageKey } from '../types';

class AsyncStorageService {
  saveItem(key: AsyncStorageKey, value: string): Promise<void> {
    return AsyncStorage.setItem(key, value).catch(() => undefined);
  }

  getItem(key: AsyncStorageKey): Promise<string | null> {
    return AsyncStorage.getItem(key).catch(() => null);
  }

  deleteItem(key: string): Promise<void> {
    return AsyncStorage.removeItem(key).catch(() => undefined);
  }

  getUser(): Promise<UserSettings> {
    return AsyncStorage.getItem(AsyncStorageKey.User).then((value) => {
      return value ? JSON.parse(value) : null;
    });
  }

  async photosSyncIsEnabled() {
    return (await this.getItem(AsyncStorageKey.PhotosSyncEnabled)) === 'true';
  }

  async savePhotosSyncIsEnabled(enabled: boolean) {
    await this.saveItem(AsyncStorageKey.PhotosSyncEnabled, enabled ? 'true' : 'false');
  }

  listItems(): Promise<readonly string[]> {
    return AsyncStorage.getAllKeys();
  }

  async clearStorage(): Promise<void> {
    await AsyncStorage.multiRemove([
      AsyncStorageKey.User,
      AsyncStorageKey.Token,
      AsyncStorageKey.PhotosToken,
      AsyncStorageKey.LastPhotosPagePulled,
      AsyncStorageKey.PhotosSyncEnabled,
    ]);

    // eslint-disable-next-line no-console
    console.info('Async Storage cleaned');
  }
}

const asyncStorageService = new AsyncStorageService();
export default asyncStorageService;
