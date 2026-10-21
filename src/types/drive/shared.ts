import type {
  ListAllSharedFoldersResponse as SdkListAllSharedFoldersResponse,
  SharedFiles as SdkSharedFiles,
  SharedFolders as SdkSharedFolders,
} from '@internxt/sdk/dist/drive/share/types';
import { WithoutDeprecatedItemFields } from './deprecatedFields';
export type { CreateSharingPayload, ListShareLinksItem } from '@internxt/sdk/dist/drive/share/types';

export type SharedFiles = WithoutDeprecatedItemFields<SdkSharedFiles>;

export type SharedFolders = WithoutDeprecatedItemFields<SdkSharedFolders>;

export type ListAllSharedFoldersResponse = Omit<SdkListAllSharedFoldersResponse, 'files' | 'folders'> & {
  files: SharedFiles[];
  folders: SharedFolders[];
};
