import errorService from '@internxt-mobile/services/ErrorService';
import { CommonActions, NavigationProp } from '@react-navigation/native';
import { useEffect } from 'react';
import { driveFolderService } from '../../../services/drive/folder/driveFolder.service';
import { DriveStackParamList } from '../../../types/navigation';
import { buildDeepLinkRoutes } from './DriveFolderScreen.helpers';

export const useDeepLinkNavigationResolver = (
  folderUuid: string,
  isDeepLinked: boolean,
  navigation: NavigationProp<DriveStackParamList>,
): void => {
  useEffect(() => {
    if (!isDeepLinked) return;

    let cancelled = false;

    const buildAndCreateStack = async () => {
      try {
        const ancestors = await driveFolderService.getFolderAncestors(folderUuid);
        if (cancelled) return;

        const routes = buildDeepLinkRoutes(folderUuid, ancestors);
        if (!routes) {
          errorService.reportError(
            new Error(`Deep link: unexpected ancestors for folderUuid=${folderUuid} (len=${ancestors.length})`),
          );
          return;
        }
        const currentRouteDepth = routes.length - 1;
        navigation.dispatch(CommonActions.reset({ index: currentRouteDepth, routes }));
      } catch (err) {
        if (cancelled) return;
        errorService.reportError(err, { extra: { folderUuid, message: 'Deep link resolution failed' } });
      }
    };

    buildAndCreateStack();

    return () => {
      cancelled = true;
    };
  }, [isDeepLinked, folderUuid]);
};
