import { NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp, CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { BottomTabNavigationProp, BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { PhotosItem } from './photos';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface RootParamList extends RootStackParamList {}
  }
}

export type RootStackParamList = {
  Debug: undefined;
  SignUp: undefined;
  SignIn: undefined;
  DeactivatedAccount: undefined;
  TabExplorer: NavigatorScreenParams<TabExplorerStackParamList> & { showReferralsBanner?: boolean };
  ForgotPassword: undefined;
  PhotosPreview: { photosItem: PhotosItem };
  Trash: undefined;
  DrivePreview: undefined;
};

export type RootStackScreenProps<Screen extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  Screen
>;

export type RootScreenNavigationProp<Screen extends keyof RootStackParamList> = NativeStackNavigationProp<
  RootStackParamList,
  Screen
>;

export type TabExplorerStackParamList = {
  Home: undefined;
  Drive: { sharedFolderId: number } | undefined;
  Add: undefined;
  Shared: undefined;
  Settings: undefined;
};

export type DriveStackParamList = {
  DriveFolder: { isRootFolder?: boolean; folderId: number; folderName: string; parentFolderName?: string };
};

export type DriveScreenProps<Screen extends keyof DriveStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<DriveStackParamList, Screen>,
  TabExplorerScreenProps<keyof TabExplorerStackParamList>
>;

export type TabExplorerScreenProps<Screen extends keyof TabExplorerStackParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabExplorerStackParamList, Screen>,
  RootStackScreenProps<keyof RootStackParamList>
>;

export type TabExplorerScreenNavigationProp<Screen extends keyof TabExplorerStackParamList> = CompositeNavigationProp<
  BottomTabNavigationProp<TabExplorerStackParamList, Screen>,
  NativeStackNavigationProp<RootStackParamList>
>;

export type PhotosStackParamList = {
  PhotosPermissions: undefined;
  PhotosGallery: undefined;
};

export type PhotosScreenProps<Screen extends keyof PhotosStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<PhotosStackParamList, Screen>,
  TabExplorerScreenProps<keyof TabExplorerStackParamList>
>;

export type PhotosScreenNavigationProp<Screen extends keyof PhotosStackParamList> = CompositeNavigationProp<
  NativeStackNavigationProp<PhotosStackParamList, Screen>,
  TabExplorerScreenNavigationProp<keyof TabExplorerStackParamList>
>;

export type SettingsStackParamList = {
  SettingsHome: { focusEnablePhotosSync?: number };
  Account: undefined;
  Storage: undefined;
  Plan: undefined;
  Security: undefined;
};

export type SettingsScreenProps<Screen extends keyof SettingsStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<SettingsStackParamList, Screen>,
  TabExplorerScreenProps<keyof TabExplorerStackParamList>
>;

export type SettingsScreenNavigationProp<Screen extends keyof SettingsStackParamList> = CompositeNavigationProp<
  NativeStackNavigationProp<SettingsStackParamList, Screen>,
  TabExplorerScreenNavigationProp<keyof TabExplorerStackParamList>
>;
