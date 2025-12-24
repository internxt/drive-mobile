import { SharedFiles, SharedFolders } from '@internxt-mobile/types/drive/shared';

export const filterSharedLinks = (sharedLinks: (SharedFiles & SharedFolders)[] | null, query?: string) => {
  if (!sharedLinks || !query) return [];
  return sharedLinks.filter((sharedLink) => sharedLink.plainName.toLowerCase().includes((query || '').toLowerCase()));
};
