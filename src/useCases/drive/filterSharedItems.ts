import { ListShareLinksItem } from '@internxt/sdk/dist/drive/share/types';
import { DriveFileData, DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';

export const filterSharedLinks = (
  sharedLinks: (ListShareLinksItem & { item: DriveFileData | DriveFolderData })[] | null,
  query?: string,
) => {
  if (!sharedLinks || !query) return [];
  return sharedLinks.filter((sharedLink) => sharedLink.item.name.toLowerCase().includes((query || '').toLowerCase()));
};
