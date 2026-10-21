/**
 * Fields of files and folders that the API is going to stop sending
 */
export type DeprecatedItemFields =
  | 'id'
  | 'name'
  | 'parentId'
  | 'parent_id'
  | 'folderId'
  | 'folder_id'
  | 'deleted'
  | 'deletedAt'
  | 'removed'
  | 'removedAt';

/**
 * File or folder as the API sends it: without the deprecated fields, and always with a plain name
 */
export type WithoutDeprecatedItemFields<T> = Omit<T, DeprecatedItemFields | 'plainName'> & { plainName: string };
