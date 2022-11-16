import analytics, { DriveAnalyticsEvent } from '@internxt-mobile/services/AnalyticsService';
import { DisplayableError } from '@internxt-mobile/services/common';
import drive from '@internxt-mobile/services/drive';
import notificationsService from '@internxt-mobile/services/NotificationsService';
import { NotificationType } from '@internxt-mobile/types/index';
import strings from 'assets/lang/strings';
import { sharedLinksUpdated } from './getShareLink';

export const deleteShareLink = async ({ shareId, type }: { shareId: string; type: 'file' | 'folder' }) => {
  try {
    const result = await drive.share.deleteShareLink({ shareId });

    sharedLinksUpdated();

    notificationsService.show({
      text1: strings.messages.linkDeleted,
      type: NotificationType.Success,
    });
    analytics.track(DriveAnalyticsEvent.SharedLinkDeleted, {
      type,
    });
    return result;
  } catch (error) {
    throw new DisplayableError({
      userFriendlyMessage: strings.errors.deleteShareLinkError,
      report: { error },
    });
  }
};
