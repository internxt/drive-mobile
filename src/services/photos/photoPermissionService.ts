import * as MediaLibrary from 'expo-media-library';
import { logger } from '../common';

export type PhotoPermissionStatus = 'granted' | 'limited' | 'denied' | 'undetermined';

const mapPermission = (status: MediaLibrary.PermissionStatus, accessPrivileges?: string): PhotoPermissionStatus => {
  if (accessPrivileges === 'all') return 'granted';
  if (accessPrivileges === 'limited') return 'limited';
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';

  return 'undetermined';
};

export const isPermissionActive = (status: PhotoPermissionStatus): boolean =>
  status === 'granted' || status === 'limited';

export const photoPermissionService = {
  async getStatus(): Promise<PhotoPermissionStatus> {
    const { status, accessPrivileges } = await MediaLibrary.getPermissionsAsync();
    return mapPermission(status, accessPrivileges);
  },

  async requestPermission(): Promise<PhotoPermissionStatus> {
    // On iOS, selecting "Limited Photos" can hang requestPermissionsAsync (inline
    // picker never dismisses on some versions). iOS sets getPermissionsAsync() to
    // 'limited' immediately on tap, so polling detects it in ~1s.
    return new Promise<PhotoPermissionStatus>((resolve) => {
      const MAX_POLL_ATTEMPTS = 30;
      let resolved = false;
      let attempts = 0;

      const resolvePermission = (result: PhotoPermissionStatus) => {
        if (resolved) return;
        resolved = true;
        resolve(result);
      };

      const poll = async () => {
        if (resolved) return;
        attempts += 1;
        try {
          const { status, accessPrivileges } = await MediaLibrary.getPermissionsAsync();
          const current = mapPermission(status, accessPrivileges);
          if (current !== 'undetermined' || attempts >= MAX_POLL_ATTEMPTS) {
            resolvePermission(current);
            return;
          }
        } catch (error) {
          logger.error('[photoPermissionService] getPermissionsAsync failed during poll', { error });
          if (attempts >= MAX_POLL_ATTEMPTS) {
            resolvePermission('undetermined');
            return;
          }
        }
        setTimeout(poll, 1000);
      };

      MediaLibrary.requestPermissionsAsync()
        .then(({ status, accessPrivileges }) => resolvePermission(mapPermission(status, accessPrivileges)))
        .catch((error) => logger.error('[photoPermissionService] requestPermissionsAsync failed', { error }));

      setTimeout(poll, 1000);
    });
  },
};
