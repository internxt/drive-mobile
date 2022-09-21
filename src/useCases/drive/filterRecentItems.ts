import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';

export const filterRecentItems = (recents: DriveFileData[] | null, query?: string) => {
  if (!recents || !query) return [];
  return recents.filter((file) => file.name.toLowerCase().includes((query || '').toLowerCase()));
};
