import { Photo } from '@internxt/sdk/dist/photos';
import { NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp, CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabNavigationProp, BottomTabScreenProps } from '@react-navigation/bottom-tabs';

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
  TabExplorer: { showReferralsBanner: boolean } | undefined;
  ForgotPassword: undefined;
  Storage: undefined;
  Billing: undefined;
  ChangePassword: undefined;
  PhotosPreview: {
    data: Photo;
    preview: string;
  };
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
  Drive: undefined;
  Add: undefined;
  Photos: undefined;
  Menu: undefined;
};

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
