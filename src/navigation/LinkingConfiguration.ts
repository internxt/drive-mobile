/**
 * Learn more about deep linking with React Navigation
 * https://reactnavigation.org/docs/deep-linking
 * https://reactnavigation.org/docs/configuring-links
 */

import { LinkingOptions } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['internxt://', 'inxt://'],
  config: {
    screens: {
      Debug: 'debug',
      SignIn: 'sign-in',
      TabExplorer: {
        path: 'tab-explorer',
        screens: {
          Drive: {
            path: 'drive',
            screens: {
              DriveFolder: 'folder/:folderUuid',
            },
          },
        },
      },
      WebLogin: 'login-success',
    },
  },
};

export default linking;
