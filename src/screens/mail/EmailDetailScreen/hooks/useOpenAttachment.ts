import { useCallback, useRef, useState } from 'react';

import strings from '../../../../../assets/lang/strings';
import { logger } from '../../../../services/common/logger/logger.service';
import { describeErrorForLog } from '../../../../services/mail/errorDescription';
import { AttachmentToOpen, downloadDecryptAndOpenAttachment } from '../../../../services/mail/mailAttachment.service';
import { notifications } from '../../../../services/NotificationsService';

/**
 * Opens the attachments of a message one at a time: taps made while one is opening are ignored.
 *
 * @returns The blob id of the attachment being opened, or null, and the function that opens one.
 */
export const useOpenAttachment = (): {
  openingAttachmentId: string | null;
  openAttachment: (attachment: AttachmentToOpen) => Promise<void>;
} => {
  const [openingAttachmentId, setOpeningAttachmentId] = useState<string | null>(null);
  const isOpeningRef = useRef(false);

  const openAttachment = useCallback(async (attachment: AttachmentToOpen) => {
    if (isOpeningRef.current) {
      return;
    }

    isOpeningRef.current = true;
    setOpeningAttachmentId(attachment.blobId);
    try {
      await downloadDecryptAndOpenAttachment(attachment);
    } catch (error) {
      logger.error('Failed to open attachment', describeErrorForLog(error));
      notifications.error(strings.screens.email_detail.attachmentOpenFailed);
    } finally {
      isOpeningRef.current = false;
      setOpeningAttachmentId(null);
    }
  }, []);

  return { openingAttachmentId, openAttachment };
};
