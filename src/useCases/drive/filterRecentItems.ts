import { DriveFileData } from '@internxt-mobile/types/drive/file';

export const filterRecentItems = (recents: DriveFileData[] | null, query?: string) => {
  if (!recents || !query) return [];
  return recents.filter((file) => file.name.toLowerCase().includes((query || '').toLowerCase()));
};
