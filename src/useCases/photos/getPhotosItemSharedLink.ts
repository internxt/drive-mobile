import { constants } from '@internxt-mobile/services/AppService';
import AuthService from '@internxt-mobile/services/AuthService';
import { SdkManager } from '@internxt-mobile/services/common';
import errorService from '@internxt-mobile/services/ErrorService';
import { notifications } from '@internxt-mobile/services/NotificationsService';
import { aes } from '@internxt/lib';
import strings from 'assets/lang/strings';
import { setString } from 'expo-clipboard';
import { randomBytes } from 'react-native-crypto';
import { Network } from 'src/lib/network';
import Share from 'react-native-share';
import photos from '@internxt-mobile/services/photos';
import { PhotosAnalyticsEventKey } from '@internxt-mobile/services/photos/analytics';

export const getPhotosItemShareLink = async ({
  photosItemFileId,
  photoId,
}: {
  photosItemFileId: string;
  photoId: string;
}) => {
  try {
    if (!photosItemFileId || !photoId) {
      return notifications.info(strings.messages.image_not_uploaded_yet);
    }
    const photosUser = photos.user.getUser();

    if (!photosUser) throw new Error('No Photos User found');
    const { credentials } = await AuthService.getAuthCredentials();

    const { mnemonic, userId, bridgeUser } = credentials.user;

    const network = new Network(bridgeUser, userId, mnemonic);

    const fileToken = await network.createFileToken(photosUser.bucketId, photosItemFileId, 'PULL');
    const plainCode = randomBytes(32).toString('hex');

    const encryptedMnemonic = aes.encrypt(mnemonic, plainCode);

    const share = await SdkManager.getInstance().photos.shares.createShare({
      token: fileToken,
      bucket: photosUser.bucketId,
      views: 9999,
      photoIds: [photoId],
      encryptedMnemonic,
    });

    return `${constants.WEB_CLIENT_URL}/sh/photos/${share.id}/${plainCode}`;
  } catch (error) {
    errorService.reportError(error);
    notifications.error(strings.errors.generateShareLinkError);
  }
};

export const copyPhotosItemSharedLink = async ({
  photosItemFileId,
  photoId,
}: {
  photosItemFileId: string;
  photoId: string;
}) => {
  try {
    const sharedLink = await getPhotosItemShareLink({ photosItemFileId, photoId });
    if (sharedLink) {
      setString(sharedLink);
      notifications.success(strings.messages.linkCopied);
    }
  } catch (error) {
    errorService.reportError(error);
    notifications.error(strings.errors.generic.title);
  }
};

export const sharePhotosItemSharedLink = async ({
  photosItemFileId,
  photoId,
  onLinkGenerated,
}: {
  photosItemFileId: string;
  photoId: string;
  onLinkGenerated: () => void;
}) => {
  try {
    const sharedLink = await getPhotosItemShareLink({ photosItemFileId, photoId });
    if (sharedLink) {
      onLinkGenerated();
      const result = await Share.open({
        message: sharedLink,
        failOnCancel: false,
      });

      if (result.success) {
        photos.analytics.track(PhotosAnalyticsEventKey.ShareLinkShared);
      }
    }
  } catch (error) {
    errorService.reportError(error);
    notifications.error(strings.errors.generic.title);
  }
};
