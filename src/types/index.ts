import { DriveFileData, DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';
import { store as storeInstance } from '../store';

type StoreType = typeof storeInstance;

export interface AppPlugin {
  install: (store: StoreType) => void;
}

export enum AppScreenKey {
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
  PhotosPreview = 'photos-preview',
}

export enum DevicePlatform {
  Mobile = 'mobile',
}
export interface DriveFolderMetadataPayload {
  itemName: string;
}
export interface DriveFileMetadataPayload {
  itemName: string;
}

export default class AppError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);

    this.status = status;
  }
}

export type Mnemonic = string;
export type NetworkUser = string;
export type NetworkPass = string;
export interface NetworkCredentials {
  encryptionKey: Mnemonic;
  user: NetworkUser;
  password: NetworkPass;
}

export interface CurrentPlan {
  name: string;
  storageLimit: number;
}

export const INFINITE_PLAN = Math.pow(1024, 4) * 99; // 99TB

export enum RenewalPeriod {
  Monthly = 'monthly',
  Annually = 'annually',
  Lifetime = 'lifetime',
}

export type StoragePlan = {
  planId: string;
  productId: string;
  name: string;
  simpleName: string;
  paymentInterval: RenewalPeriod;
  price: number;
  monthlyPrice: number;
  currency: string;
  isTeam: boolean;
  isLifetime: boolean;
  renewalPeriod: RenewalPeriod;
  storageLimit: number;
};

export enum SortDirection {
  Asc = 'asc',
  Desc = 'desc',
}

export enum SortType {
  Name = 'name',
  Size = 'size',
  UpdatedAt = 'updatedAt',
}

export type DriveItemData = DriveFileData & DriveFolderData;

export enum ToastType {
  Info = 'info',
  Success = 'success',
  Warning = 'warning',
  Error = 'error',
  Upload = 'upload',
  Download = 'download',
}
