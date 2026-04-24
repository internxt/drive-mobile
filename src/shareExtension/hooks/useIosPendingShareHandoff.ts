import { NavigationContainerRef } from '@react-navigation/native';
import { useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { AppGroupPendingShareService } from 'src/services/AppGroupPendingShareService';
import errorService from 'src/services/ErrorService';
import { RootStackParamList } from 'src/types/navigation';
import strings from '../../../assets/lang/strings';

export const handleLargeShareDeepLink = async (
  navigationContainerRef: NavigationContainerRef<RootStackParamList> | undefined,
  isLoggedIn: boolean | null,
  url: string,
) => {
  if (Platform.OS !== 'ios' || !isLoggedIn) return;

  const metadata = await AppGroupPendingShareService.read().catch((error) => {
    errorService.reportError(error, { extra: { message: 'Failed to read pending share (link handler)' } });
    return null;
  });

  if (metadata) {
    if (AppGroupPendingShareService.isStale(metadata)) {
      AppGroupPendingShareService.clear().catch((error) =>
        errorService.reportError(error, { extra: { message: 'Failed to clear stale pending share (link handler)' } }),
      );
      return;
    }
    navigationContainerRef?.navigate('LargeShareUpload', { metadata });
  } else {
    const error = new Error('handle-large-share deep link received but pending_share_upload.json is missing');
    errorService.reportError(error, { extra: { url } });
    Alert.alert(strings.screens.ShareExtension.handoffErrorTitle, strings.screens.ShareExtension.handoffErrorMessage);
  }
};

/**
 * Startup check for the large-file share handoff.
 * Reads the App Group on login to handle cold starts and orphaned pending_share_upload.json.
 */
export const useIosPendingShareHandoff = (
  navigationContainerRef: NavigationContainerRef<RootStackParamList> | undefined,
  isLoggedIn: boolean | null,
) => {
  useEffect(() => {
    if (Platform.OS !== 'ios' || !isLoggedIn) return;

    AppGroupPendingShareService.read()
      .then((metadata) => {
        if (!metadata) return;
        if (AppGroupPendingShareService.isStale(metadata)) {
          AppGroupPendingShareService.clear().catch((error) =>
            errorService.reportError(error, { extra: { message: 'Failed to clear stale pending share (startup)' } }),
          );
          return;
        }
        navigationContainerRef?.navigate('LargeShareUpload', { metadata });
      })
      .catch((error) =>
        errorService.reportError(error, { extra: { message: 'Failed to read pending share on startup' } }),
      );
  }, [isLoggedIn]);
};
