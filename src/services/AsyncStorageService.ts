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

  async getLastPhotoPulledDate() {
    const lastPhotoPulledDateStr = await this.getItem(AsyncStorageKey.LastPhotoPulledDate);

    if (!lastPhotoPulledDateStr) return null;

    return new Date(lastPhotoPulledDateStr);
  }

  async getScreenLockIsEnabled() {
    const screenLockIsEnabledStr = await this.getItem(AsyncStorageKey.ScreenLockIsEnabled);

    return screenLockIsEnabledStr === 'true';
  }

  saveScreenLockIsEnabled(screenLockIsEnabled: boolean) {
    return this.saveItem(AsyncStorageKey.ScreenLockIsEnabled, screenLockIsEnabled ? 'true' : 'false');
  }

  saveLastScreenUnlock(lastScreenUnlock: Date) {
    return this.saveItem(AsyncStorageKey.LastScreenLock, lastScreenUnlock.toISOString());
  }

  async getLastScreenUnlock() {
    const lastScreenUnlock = await this.getItem(AsyncStorageKey.LastScreenLock);

    if (!lastScreenUnlock) return null;
    return new Date(lastScreenUnlock);
  }

  async saveLastPhotoPulledDate(date: Date) {
    if (!(date instanceof Date)) throw new Error('Invalid date received');
    await this.saveItem(AsyncStorageKey.LastPhotoPulledDate, date.toISOString());
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
      AsyncStorageKey.LastPhotoPulledDate,
      AsyncStorageKey.ScreenLockIsEnabled,
      AsyncStorageKey.LastScreenLock,
    ]);

    // eslint-disable-next-line no-console
    console.info('Async Storage cleaned');
  }
}

const asyncStorageService = new AsyncStorageService();
export default asyncStorageService;
