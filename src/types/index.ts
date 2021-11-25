export enum AppScreen {
  SignUp = 'sign-up',
  SignIn = 'sign-in',
  Intro = 'intro',
  TabExplorer = 'tab-explorer',
  Home = 'home',
  Menu = 'menu',
  Drive = 'drive',
  Recents = 'recents',
  Shared = 'shared',
  CreateFolder = 'create-folder',
  ForgotPassword = 'forgot-password',
  ChangePassword = 'change-password',
  RecoverPassword = 'recover-password',
  OutOfSpace = 'out-of-space',
  Storage = 'storage',
  Billing = 'billing',
  Photos = 'photos',
  PhotoPreview = 'photo-preview',
}

export enum DevicePlatform {
  Mobile = 'mobile',
}

export interface DriveFolderData {
  id: number;
  bucket: string | null;
  color: string | null;
  createdAt: string;
  encrypt_version: string | null;
  icon: string | null;
  iconId: number | null;
  icon_id: number | null;
  isFolder: boolean;
  name: string;
  parentId: number;
  parent_id: number | null;
  updatedAt: string;
  userId: number;
  user_id: number;
}
export interface DriveFolderMetadataPayload {
  itemName: string;
}

export interface DriveFileData {
  bucket: string;
  createdAt: string;
  created_at: string;
  deleted: false;
  deletedAt: null;
  encrypt_version: string;
  fileId: string;
  folderId: number;
  folder_id: number;
  id: number;
  name: string;
  size: number;
  type: string;
  updatedAt: string;
}
export interface DriveFileMetadataPayload {
  itemName: string;
}
