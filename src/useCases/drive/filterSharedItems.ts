import { SharedFiles, SharedFolders } from '@internxt/sdk/dist/drive/share/types';

export const filterSharedLinks = (sharedLinks: (SharedFiles & SharedFolders)[] | null, query?: string) => {
  if (!sharedLinks || !query) return [];
  return sharedLinks.filter((sharedLink) => sharedLink.plainName.toLowerCase().includes((query || '').toLowerCase()));
};
