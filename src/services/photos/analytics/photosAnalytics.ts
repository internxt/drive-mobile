import analyticsService, { AnalyticsService, JsonMap } from '@internxt-mobile/services/AnalyticsService';
import { BaseLogger } from '@internxt-mobile/services/common';
import analytics from '@rudderstack/rudder-sdk-react-native';
import { ENABLE_PHOTOS_ANALYTICS } from '../constants';

export enum PhotosAnalyticsEventKey {
  BackupPaused = 'Backup Paused',
  BackupCompleted = 'Backup Completed',
  BackupResumed = 'Backup Resumed',
  BackupStopped = 'Backup Photos Stopped',
  BackupStarted = 'Backup Photos Started',
  ShareLinkSelected = 'Sharing Link Selected',
  ShareLinkShared = 'Sharing Link Shared',
  ThreeDotsMenuSelected = 'Three Dots Menu Selected',
  MultipleSelectionActivated = 'Multiple Selection Activated',
  MoveToTrashSelected = 'Move to Trash Selected',
  MoveToTrashConfirmed = 'Move to Trash Confirmed',
  MoveToTrashCanceled = 'Move to Trash Canceled',
  ExportPhotoSelected = 'Export Photo Selected',
  PhotoExported = 'Photo Exported',
  DownloadPhotoSelected = 'Download Photo Selected',
  PhotoDownloaded = 'Photo Downloaded',
  PhotoInfoSelected = 'Photo Info Selected',
}

export enum PhotosAnalyticsScreenKey {
  PhotosGallery = 'Photos Gallery',
  PhotosThreeDotsMenu = 'Photos Three Dots Menu',
  PhotoInfo = 'Photos Info',
}
export class PhotosAnalytics {
  private user: { email: string; uuid: string } | null = null;
  private analytics: typeof analytics;

  private logger = new BaseLogger({
    tag: 'PHOTOS_ANALYTICS',
    disabled: !__DEV__,
  });
  constructor(analytics: AnalyticsService) {
    /**
     * The drive analytics service is disabled since the events
     * are wrong, here we create another "analytics" service
     * getting the client from the generic analytics service, so
     * the drive events will be bypassed, once we get the
     * Drive events back, we can use the same service
     */
    this.analytics = analytics.getClient();
  }

  setUser(user: { email: string; uuid: string }) {
    if (!ENABLE_PHOTOS_ANALYTICS) return;
    this.user = user;
    this.identify();
    this.logger.info('User identified');
  }
  screen(screenKey: PhotosAnalyticsScreenKey, props: JsonMap = {}) {
    if (!ENABLE_PHOTOS_ANALYTICS) return;
    this.analytics.screen(screenKey, props);
    this.logger.info(`"${screenKey}" screen tracked`);
  }

  track(event: PhotosAnalyticsEventKey, props: JsonMap = {}) {
    if (!ENABLE_PHOTOS_ANALYTICS) return;
    this.analytics.track(event as any, props);
    this.logger.info(`"${event}" event tracked`);
  }

  identify(traits = {}) {
    if (!ENABLE_PHOTOS_ANALYTICS) return;
    if (!this.user) {
      // eslint-disable-next-line no-console, quotes
      console.warn("Can't identify, user is not setted");
      return;
    }

    this.analytics.identify(this.user.uuid, traits);
  }
}

export const photosAnalytics = new PhotosAnalytics(analyticsService);
