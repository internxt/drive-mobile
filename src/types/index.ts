import { store as storeInstance } from '../store';

type StoreType = typeof storeInstance;

export enum AppStage {
  Development = 'development',
  Production = 'production',
}

export interface AppPlugin {
  install: (store: StoreType) => void;
}

export enum AppScreenKey {
  Debug = 'debug',
  SignUp = 'sign-up',
  SignIn = 'sign-in',
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

export enum NotificationType {
  Info = 'info',
  Success = 'success',
  Warning = 'warning',
  Error = 'error',
  Upload = 'upload',
  Download = 'download',
}

export interface NotificationData {
  type: NotificationType;
  text1: string;
  text2?: string;
}

export interface User {
  bucket: string;
  createdAt: string;
  credit: number;
  email: string;
  username: string;
  bridgeUser: string;
  lastname: string;
  mnemonic: string;
  name: string;
  privateKey: string;
  publicKey: string;
  registerCompleted: boolean;
  revocateKey: string;
  root_folder_id: number;
  teams: boolean;
  userId: string;
  uuid: string;
}

export enum AsyncStorageKey {
  User = 'xUser',
  Token = 'xToken',
  PhotosToken = 'photosToken',
}

export type ProgressCallback = (progress: number) => void;
