import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { logger } from '@internxt-mobile/services/common/logger/logger.service';
import { openDraft } from '@internxt-mobile/services/mail/draft.service';
import { readHttpStatus } from '@internxt-mobile/services/mail/errors';
import strings from '../../../../../assets/lang/strings';
import { HTTP_NOT_FOUND } from '../../../../services/common/httpStatusCodes';
import { notifications } from '../../../../services/NotificationsService';
import { DraftAttachments, DraftComposeParams, DraftContent } from '../../../../types/mail';
import { RootStackScreenProps } from '../../../../types/navigation';
import { getSendErrorMessage, isSendRateLimited } from '../sendErrors';
import { RecipientsByField } from '../utils/composeRecipients';
import { useDraftAutosave } from './useDraftAutosave';

export const LEAVE_WITHOUT_SAVING_DELAY_MS = 8000;

type ComposeNavigation = RootStackScreenProps<'ComposeEmail'>['navigation'];
type OpenedDraftContent = Omit<DraftContent, 'draftAttachments'>;

/**
 * Takes care of the draft of a message being written: opens it, keeps it saved, saves it before the
 * screen is left, discards it, and gets it out of the way while the message is sent. The screen cannot
 * be left while the draft is being saved or discarded, or while the message is being sent.
 *
 * @param params - The message the draft belongs to.
 * @param params.navigation - Navigation of the compose screen, whose leaving is held while the draft is
 * saved or the message is sent.
 * @param params.draftToOpen - The draft the message was opened from, if any.
 * @param params.isEnabled - Whether the message keeps a draft at all.
 * @param params.mnemonic - Mnemonic of the account, which unlocks the draft being opened.
 * @param params.recipients - Recipients of the message, with what is typed in each field already added.
 * @param params.subject - Subject of the message.
 * @param params.body - Body of the message, as typed.
 * @param params.onDraftOpened - Receives what the opened draft holds, so the screen can show it.
 * @returns Whether the draft has loaded, can be discarded and failed to save, the attachments it carries,
 * the actions that remove them, discard the draft, prepare for sending, handle a failed send and leave
 * once the message is sent, plus the props of the loader shown while the draft is saved or discarded.
 */
export const useDraftLifecycle = ({
  navigation,
  draftToOpen,
  isEnabled,
  mnemonic,
  recipients,
  subject,
  body,
  onDraftOpened,
}: {
  navigation: ComposeNavigation;
  draftToOpen?: DraftComposeParams;
  isEnabled: boolean;
  mnemonic?: string;
  recipients: RecipientsByField;
  subject: string;
  body: string;
  onDraftOpened: (openedDraft: OpenedDraftContent) => void;
}) => {
  const [draftAttachments, setDraftAttachments] = useState<DraftAttachments | null>(null);
  const [isDraftLoaded, setIsDraftLoaded] = useState(!draftToOpen);
  const [isBlockingLoaderVisible, setIsBlockingLoaderVisible] = useState(false);
  const [blockingLoaderMessage, setBlockingLoaderMessage] = useState('');
  const [leaveWithoutSaving, setLeaveWithoutSaving] = useState<(() => void) | null>(null);
  const isLeavingBlockedRef = useRef(false);
  const isLeaveAllowedRef = useRef(false);
  const leaveWithoutSavingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    hasSavedDraft,
    hasFailedToSave,
    hasUnsavedChanges,
    saveDraftNow,
    pauseSavingForSending,
    resumeSaving,
    discardSavedDraft,
  } = useDraftAutosave({
    isEnabled,
    initialDraftId: draftToOpen?.draftId,
    isContentReady: isDraftLoaded,
    draftContent: { ...recipients, subject, body, draftAttachments },
  });

  const showBlockingLoader = (message: string) => {
    isLeavingBlockedRef.current = true;
    setBlockingLoaderMessage(message);
    setIsBlockingLoaderVisible(true);
  };

  const hideBlockingLoader = () => {
    isLeavingBlockedRef.current = false;
    setIsBlockingLoaderVisible(false);
  };

  const clearLeaveWithoutSavingTimeout = () => {
    if (leaveWithoutSavingTimeoutRef.current) {
      clearTimeout(leaveWithoutSavingTimeoutRef.current);
      leaveWithoutSavingTimeoutRef.current = null;
    }
  };

  const leaveNow = (leaveAction?: Parameters<ComposeNavigation['dispatch']>[0]) => {
    isLeaveAllowedRef.current = true;
    if (leaveAction) {
      navigation.dispatch(leaveAction);
    } else {
      navigation.goBack();
    }
    isLeaveAllowedRef.current = false;
  };

  useEffect(() => {
    if (!draftToOpen) {
      return;
    }
    const { draft: draftStrings } = strings.screens.compose_email;
    if (!mnemonic) {
      logger.warn('Cannot open the draft without the mnemonic of the account');
      notifications.error(draftStrings.openFailed);
      navigation.goBack();
      return;
    }

    let isScreenGone = false;
    openDraft({ draftId: draftToOpen.draftId, mnemonic })
      .then(({ draftAttachments: openedDraftAttachments, ...openedDraft }) => {
        if (isScreenGone) {
          return;
        }
        onDraftOpened(openedDraft);
        setDraftAttachments(openedDraftAttachments);
        setIsDraftLoaded(true);
      })
      .catch((error) => {
        if (isScreenGone) {
          return;
        }
        if (readHttpStatus(error) === HTTP_NOT_FOUND) {
          logger.warn('The draft to open no longer exists');
          notifications.info(draftStrings.notFound);
        } else {
          logger.error('Failed to open the draft', error);
          notifications.error(draftStrings.openFailed);
        }
        navigation.goBack();
      });

    return () => {
      isScreenGone = true;
    };
  }, []);

  useEffect(() => {
    const unsubscribeFromRemoval = navigation.addListener('beforeRemove', (removalEvent) => {
      if (isLeaveAllowedRef.current) {
        return;
      }
      if (isLeavingBlockedRef.current) {
        removalEvent.preventDefault();
        return;
      }
      if (!hasUnsavedChanges()) {
        return;
      }

      removalEvent.preventDefault();
      const { draft: draftStrings } = strings.screens.compose_email;
      let isLeaveSettled = false;

      const stopWaitingForTheSave = () => {
        isLeaveSettled = true;
        clearLeaveWithoutSavingTimeout();
        setLeaveWithoutSaving(null);
        hideBlockingLoader();
      };

      const leaveTheScreen = () => {
        if (isLeaveSettled) {
          return;
        }
        stopWaitingForTheSave();
        leaveNow(removalEvent.data.action);
      };
      const offerToLeaveWithoutSaving = () => {
        if (isLeaveSettled) {
          return;
        }
        stopWaitingForTheSave();
        Alert.alert(draftStrings.saveFailed, undefined, [
          { text: draftStrings.keepEditing, style: 'cancel' },
          {
            text: draftStrings.leaveWithoutSaving,
            style: 'destructive',
            onPress: () => leaveNow(removalEvent.data.action),
          },
        ]);
      };
      leaveWithoutSavingTimeoutRef.current = setTimeout(
        () => setLeaveWithoutSaving(() => leaveTheScreen),
        LEAVE_WITHOUT_SAVING_DELAY_MS,
      );

      showBlockingLoader(draftStrings.saving);
      saveDraftNow().then(leaveTheScreen, offerToLeaveWithoutSaving);
    });

    return () => {
      unsubscribeFromRemoval();
      clearLeaveWithoutSavingTimeout();
    };
  }, [navigation]);

  const removeDraftAttachment = (blobId: string) => {
    setDraftAttachments(
      (currentDraftAttachments) =>
        currentDraftAttachments && {
          ...currentDraftAttachments,
          attachments: currentDraftAttachments.attachments.filter((attachment) => attachment.blobId !== blobId),
        },
    );
  };

  const confirmAndDiscardDraft = () => {
    const { draft: draftStrings } = strings.screens.compose_email;
    Alert.alert(draftStrings.discard, draftStrings.discardConfirmation, [
      { text: draftStrings.keepEditing, style: 'cancel' },
      {
        text: draftStrings.confirmDiscard,
        style: 'destructive',
        onPress: () => {
          showBlockingLoader(draftStrings.discarding);
          discardSavedDraft()
            .then(() => {
              hideBlockingLoader();
              leaveNow();
            })
            .catch((error) => {
              logger.error('Failed to discard the draft', error);
              hideBlockingLoader();
              resumeSaving();
              notifications.error(draftStrings.discardFailed);
            });
        },
      },
    ]);
  };

  const prepareDraftForSending = async (): Promise<string | undefined> => {
    isLeavingBlockedRef.current = true;
    return (await pauseSavingForSending()) ?? undefined;
  };

  const handleFailedSend = async (error: unknown): Promise<string> => {
    isLeavingBlockedRef.current = false;
    if (!isEnabled) {
      return getSendErrorMessage(error);
    }

    resumeSaving();
    if (!isSendRateLimited(error)) {
      return getSendErrorMessage(error);
    }

    const wasDraftSaved = await saveDraftNow().then(
      () => true,
      () => false,
    );
    return wasDraftSaved ? strings.screens.compose_email.errors.sendRateLimitedDraftSaved : getSendErrorMessage(error);
  };

  const leaveAfterSending = () => {
    isLeavingBlockedRef.current = false;
    leaveNow();
  };

  return {
    isDraftLoaded,
    draftAttachments,
    canDiscardDraft: isEnabled && isDraftLoaded && hasSavedDraft,
    hasFailedToSaveDraft: isEnabled && hasFailedToSave,
    removeDraftAttachment,
    confirmAndDiscardDraft,
    prepareDraftForSending,
    handleFailedSend,
    leaveAfterSending,
    blockingLoaderProps: {
      isOpen: isBlockingLoaderVisible,
      message: blockingLoaderMessage,
      actionLabel: strings.screens.compose_email.draft.leaveWithoutSaving,
      onAction: leaveWithoutSaving ?? undefined,
    },
  };
};
