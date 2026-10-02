import { useEffect, useState } from 'react';

import { BLOCKED_REMOTE_IMAGE_MESSAGE } from '../../../services/mail/emailBody/emailDocument';

export type BlockedRemoteImages = {
  hasBlockedRemoteImages: boolean;
  isBlockedRemoteImageReport: (reportedMessage: string) => boolean;
  onBlockedRemoteImageReported: () => void;
};

/**
 * Keeps whether the document of a message reported an image blocked by its content security policy.
 *
 * @param emailDocument the document handed to the web view; a new one starts over with nothing blocked
 */
export const useBlockedRemoteImages = (emailDocument: string): BlockedRemoteImages => {
  const [hasBlockedRemoteImages, setHasBlockedRemoteImages] = useState(false);

  useEffect(() => {
    setHasBlockedRemoteImages(false);
  }, [emailDocument]);

  return {
    hasBlockedRemoteImages,
    isBlockedRemoteImageReport: (reportedMessage) => reportedMessage === BLOCKED_REMOTE_IMAGE_MESSAGE,
    onBlockedRemoteImageReported: () => setHasBlockedRemoteImages(true),
  };
};
