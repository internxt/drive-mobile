import { SharedFiles, SharedFolders } from '@internxt/sdk/dist/drive/share/types';
import { DriveItemData, DriveItemStatus } from './item';

/**
 * View mode for drive lists (list vs grid)
 */
export enum DriveListViewMode {
  List = 'list',
  Grid = 'grid',
}

/**
 * Type of drive list being displayed
 */
export enum DriveListType {
  Drive = 'drive',
  Shared = 'shared',
}

/**
 * Sort direction for lists
 */
export enum SortDirection {
  Asc = 'asc',
  Desc = 'desc',
}

/**
 * Sort type for lists
 */
export enum SortType {
  Name = 'name',
  Size = 'size',
  UpdatedAt = 'updatedAt',
}

/**
 * Props for DriveItem components (both list and grid mode)
 */
export interface DriveItemProps {
  type: DriveListType;
  viewMode: DriveListViewMode;
  status: DriveItemStatus;
  data: DriveItemData;
  isLoading?: boolean;
  nameEncrypted?: boolean;
  selectable?: boolean;
  subtitle?: JSX.Element;
  progress?: number;
  isSelected?: boolean;
  shareLink?: SharedFiles & SharedFolders;
  onActionsPress?: () => void;
  onPress?: () => void;
  children?: string;
  hideOptionsButton?: boolean;
}

/**
 * Props for navigable drive items
 */
export interface DriveNavigableItemProps extends DriveItemProps {
  isLoading?: boolean;
  disabled?: boolean;
  onItemPressed?: (item: DriveItemData) => void;
}
