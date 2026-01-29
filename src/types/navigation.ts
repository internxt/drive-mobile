import type { BottomTabNavigationProp, BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp, CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface RootParamList extends RootStackParamList {}
  }
}

export type RootStackParamList = {
  Debug: undefined;
  SignIn: undefined;
  WebLogin: {
    mnemonic?: string;
    token?: string;
    newToken?: string;
    privateKey?: string;
  } | undefined;
  DeactivatedAccount: undefined;
  TabExplorer: NavigatorScreenParams<TabExplorerStackParamList>;
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
  DriveFolder: {
    isRootFolder?: boolean;
    folderUuid: string;
    folderName: string;
    parentFolderName?: string;
    parentUuid: string;
  };
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

export type SettingsStackParamList = {
  SettingsHome: undefined;
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
