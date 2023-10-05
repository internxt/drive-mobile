import analytics, { DriveAnalyticsEvent } from '@internxt-mobile/services/AnalyticsService';
import AuthService from '@internxt-mobile/services/AuthService';
import drive from '@internxt-mobile/services/drive';
import errorService from '@internxt-mobile/services/ErrorService';
import notificationsService from '@internxt-mobile/services/NotificationsService';
import { DriveEventKey } from '@internxt-mobile/types/drive';
import { NotificationType } from '@internxt-mobile/types/index';
import { aes } from '@internxt/lib';
import strings from 'assets/lang/strings';
import { setStringAsync } from 'expo-clipboard';
import { randomBytes } from 'react-native-crypto';
import { Network } from 'src/lib/network';

/**
 * Gets an already generated share link
 */
export const getExistingShareLink = async ({
  uuid,
  code,
  copyLinkToClipboard,
  type,
}: {
  uuid?: string;
  code?: string;
  copyLinkToClipboard?: boolean;
  type: 'file' | 'folder';
}) => {
  try {
    if (!uuid || !code) {
      throw new Error('Id or code missing, cannot generate share link');
    }
    const link = await drive.share.getShareLinkFromCodeAndToken({
      type,
      uuid,
      code,
    });

    if (copyLinkToClipboard) {
      await setStringAsync(link);
      notificationsService.show({
        text1: strings.modals.LinkCopied.message,
        type: NotificationType.Success,
      });
    }

    return link;
  } catch (error) {
    notificationsService.error(strings.errors.generateShareLinkError);
    errorService.reportError({
      error,
    });
  }
};

/**
 * Display a notification to copy the given link
 */
export const copyShareLink = ({ link, type }: { link: string; type: 'file' | 'folder' }) => {
  notificationsService.show({
    text1: strings.components.file_and_folder_options.linkReady,
    type: NotificationType.Success,
    action: {
      text: strings.buttons.copyLink,
      onActionPress: async () => {
        await setStringAsync(link);
        analytics.track(DriveAnalyticsEvent.SharedLinkCopied, {
          type,
        });
      },
    },
  });
};

export const shareExistingShareLink = ({ link }: { link: string }) => {
  return drive.share.shareGeneratedSharedLink(link);
};

export const sharedLinksUpdated = () => {
  drive.events.emit({
    event: DriveEventKey.SharedLinksUpdated,
  });
};

export const onSharedLinksUpdated = (callback: () => void) => {
  drive.events.addListener({
    event: DriveEventKey.SharedLinksUpdated,
    listener: callback,
  });

  return () => {
    drive.events.removeListener({
      event: DriveEventKey.SharedLinksUpdated,
      listener: callback,
    });
  };
};

/**
 * Generates a share link for a given Drive item
 */
export const generateShareLink = async ({
  itemId,
  fileId,
  displayCopyNotification,
  type,
  plainPassword,
}: {
  itemId: string;
  fileId?: string;
  plainPassword?: string;
  displayCopyNotification?: boolean;
  type: 'file' | 'folder';
}) => {
  try {
    const { credentials } = await AuthService.getAuthCredentials();

    if (!credentials?.user) throw new Error('User credentials not found');

    const { bucket, mnemonic, email, userId } = credentials.user;
    const network = new Network(email, userId, mnemonic);
    // Random code for the file
    const plainCode = randomBytes(32).toString('hex');

    // 1. Get the file token
    const itemToken = await network.createFileToken(bucket, fileId as string, 'PULL');

    // 2. Create an encrypted code for the file
    const encryptedCode = aes.encrypt(plainCode, mnemonic);

    // 3. Encrypt the mnemonic
    const encryptedMnemonic = aes.encrypt(mnemonic, plainCode);

    // 4. Generate the share link
    const link = await drive.share.generateShareLink(
      {
        encryptionAlgorithm: 'inxt-v2',
        encryptionKey: encryptedMnemonic,
        itemType: type,
        encryptedCode,
        itemId,
      },
      mnemonic,
    );

    if (displayCopyNotification && link) {
      copyShareLink({ link, type });
    }
    sharedLinksUpdated();
    return {
      link,
    };
  } catch (error) {
    notificationsService.error(strings.errors.generateShareLinkError);
    errorService.reportError({
      error,
    });
  }
};