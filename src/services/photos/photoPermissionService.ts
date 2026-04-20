import * as MediaLibrary from 'expo-media-library';

export type PhotoPermissionStatus = 'granted' | 'limited' | 'denied' | 'undetermined';

const mapPermission = (status: MediaLibrary.PermissionStatus, accessPrivileges?: string): PhotoPermissionStatus => {
  if (accessPrivileges === 'all') return 'granted';
  if (accessPrivileges === 'limited') return 'limited';
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';

  return 'undetermined';
};

export const photoPermissionService = {
  async getStatus(): Promise<PhotoPermissionStatus> {
    const { status, accessPrivileges } = await MediaLibrary.getPermissionsAsync();
    return mapPermission(status, accessPrivileges);
  },

  async requestPermission(): Promise<PhotoPermissionStatus> {
    const { status, accessPrivileges } = await MediaLibrary.requestPermissionsAsync();
    return mapPermission(status, accessPrivileges);
  },
};
