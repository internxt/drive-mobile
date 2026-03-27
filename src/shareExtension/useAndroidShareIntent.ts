import { NavigationContainerRef } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { DeviceEventEmitter, NativeModules, Platform } from 'react-native';
import { logger } from '../services/common';
import { RootStackParamList } from '../types/navigation';
import { SharedFile } from './types';

export const useAndroidShareIntent = (
  navigationContainerRef: NavigationContainerRef<RootStackParamList> | undefined,
  isLoggedIn: boolean | null,
) => {
  const [pendingFiles, setPendingFiles] = useState<SharedFile[] | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    NativeModules.ShareIntentModule?.getSharedFiles()
      ?.then((files: SharedFile[] | null) => {
        if (files?.length) setPendingFiles(files);
      })
      ?.catch(() => {
        logger.error('Failed to get shared files from intent');
      });
  }, []);

  useEffect(() => {
    if (!pendingFiles?.length || isLoggedIn == null) return;
    navigationContainerRef?.navigate('AndroidShare', { files: pendingFiles });
    setPendingFiles(null);
  }, [pendingFiles, isLoggedIn, navigationContainerRef]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = DeviceEventEmitter.addListener('ShareIntentReceived', (files: SharedFile[]) => {
      if (files?.length) {
        navigationContainerRef?.navigate('AndroidShare', { files });
      }
    });
    return () => subscription.remove();
  }, [navigationContainerRef]);
};
