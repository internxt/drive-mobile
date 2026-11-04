import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { logger } from '@internxt-mobile/services/common/logger/logger.service';
import { openDraft } from '@internxt-mobile/services/mail/draft.service';
import { readHttpStatus } from '@internxt-mobile/services/mail/errorDescription';
import strings from '../../../../../assets/lang/strings';
import { HTTP_NOT_FOUND } from '../../../../services/common/httpStatusCodes';
import { notifications } from '../../../../services/NotificationsService';
import { DraftComposeParams, DraftContent, UploadedAttachments } from '../../../../types/mail';
import { RootStackScreenProps } from '../../../../types/navigation';
import { BlockingLoaderAction } from '../components/BlockingLoaderModal';
import { getSendErrorMessage, isSendRateLimited } from '../sendErrors';
import { RecipientsByField } from '../utils/composeRecipients';
import { useDraftAutosave } from './useDraftAutosave';

export const LEAVE_WITHOUT_SAVING_DELAY_MS = 8000;

type ComposeNavigation = RootStackScreenProps<'ComposeEmail'>['navigation'];
type LeaveAction = Parameters<ComposeNavigation['dispatch']>[0];
type LeaveAttempt = { leaveAction: LeaveAction; isSettled: boolean };
type BlockingLoaderState = { isOpen: boolean; message: string; isLoading: boolean; actions: BlockingLoaderAction[] };

const HIDDEN_BLOCKING_LOADER: BlockingLoaderState = { isOpen: false, message: '', isLoading: false, actions: [] };
const RESET_ACTION_TYPE = 'RESET';

/**
 * Takes care of the draft of a message being written: opens it, keeps it saved, waits for its
 * attachments and saves it before the screen is left, discards it, and gets it out of the way while the
 * message is sent. The screen cannot be left while the draft is being saved or discarded, or while the
 * message is being sent, except by a navigation reset.
 *
 * @param params - The message the draft belongs to.
 * @param params.navigation - Navigation of the compose screen, whose leaving is held while the draft is
 * saved or the message is sent.
 * @param params.draftToOpen - The draft the message was opened from, if any.
 * @param params.isEnabled - Whether the message keeps a draft at all.
 * @param params.mnemonic - Mnemonic of the account, which unlocks the draft being opened.
 * @param params.recipients - Recipients of the message, with what is typed in each field already added.
 * @param params.subject - Subject of the message.
 * @param params.body - Body of the message, as markup.
 * @param params.isBodyReady - Whether the body field has reported the body it starts with; nothing is
 * saved before.
 * @param params.draftAttachments - Attachments of the message already uploaded, with their key.
 * @param params.isUploadingAttachments - Whether any attachment of the message is still uploading.
 * @param params.failedAttachmentCount - How many attachments of the message failed to upload.
 * @param params.onDraftOpened - Receives what the opened draft holds, so the screen can show it.
 * @returns Whether the draft has loaded, can be discarded and failed to save, the actions that discard
 * the draft, prepare for sending, handle a failed send and leave once the message is sent, plus the
 * props of the loader shown while leaving waits for attachments or for the draft to be saved, while the draft
 * is discarded, or while leaving asks the user.
 */
export const useDraftLifecycle = ({
  navigation,
  draftToOpen,
  isEnabled,
  mnemonic,
  recipients,
  subject,
  body,
  isBodyReady,
  draftAttachments,
  isUploadingAttachments,
  failedAttachmentCount,
  onDraftOpened,
}: {
  navigation: ComposeNavigation;
  draftToOpen?: DraftComposeParams;
  isEnabled: boolean;
  mnemonic?: string;
  recipients: RecipientsByField;
  subject: string;
  body: string;
  isBodyReady: boolean;
  draftAttachments: UploadedAttachments;
  isUploadingAttachments: boolean;
  failedAttachmentCount: number;
  onDraftOpened: (openedDraft: DraftContent) => void;
}) => {
  const [isDraftLoaded, setIsDraftLoaded] = useState(!draftToOpen);
  const [blockingLoader, setBlockingLoader] = useState<BlockingLoaderState>(HIDDEN_BLOCKING_LOADER);
  const [waitingLeaveAttempt, setWaitingLeaveAttempt] = useState<LeaveAttempt | null>(null);
  const isLeavingBlockedRef = useRef(false);
  const isLeaveAllowedRef = useRef(false);
  const leaveWithoutSavingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUnmountedRef = useRef(false);

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
    isContentReady: isDraftLoaded && isBodyReady,
    draftContent: { ...recipients, subject, body, draftAttachments },
  });

  const showBlockingLoader = (message: string) => {
    isLeavingBlockedRef.current = true;
    setBlockingLoader({ isOpen: true, message, isLoading: true, actions: [] });
  };

  const askInBlockingLoader = (message: string, actions: BlockingLoaderAction[]) => {
    isLeavingBlockedRef.current = true;
    setBlockingLoader({ isOpen: true, message, isLoading: false, actions });
  };

  const hideBlockingLoader = () => {
    isLeavingBlockedRef.current = false;
    setBlockingLoader(HIDDEN_BLOCKING_LOADER);
  };

  const clearLeaveWithoutSavingTimeout = () => {
    if (leaveWithoutSavingTimeoutRef.current) {
      clearTimeout(leaveWithoutSavingTimeoutRef.current);
      leaveWithoutSavingTimeoutRef.current = null;
    }
  };

  const leaveNow = (leaveAction?: LeaveAction) => {
    if (isUnmountedRef.current) {
      return;
    }
    isLeaveAllowedRef.current = true;
    if (leaveAction) {
      navigation.dispatch(leaveAction);
    } else {
      navigation.goBack();
    }
    isLeaveAllowedRef.current = false;
  };

  const settleLeaveAttempt = (leaveAttempt: LeaveAttempt) => {
    leaveAttempt.isSettled = true;
    clearLeaveWithoutSavingTimeout();
    setWaitingLeaveAttempt(null);
    hideBlockingLoader();
  };

  const leaveWithoutWaiting = (leaveAttempt: LeaveAttempt) => {
    if (leaveAttempt.isSettled) {
      return;
    }
    settleLeaveAttempt(leaveAttempt);
    leaveNow(leaveAttempt.leaveAction);
  };

  const beginLeaveAttempt = (leaveAction: LeaveAction, message: string): LeaveAttempt => {
    const { draft: draftStrings } = strings.screens.compose_email;
    const leaveAttempt = { leaveAction, isSettled: false };
    showBlockingLoader(message);
    leaveWithoutSavingTimeoutRef.current = setTimeout(
      () =>
        setBlockingLoader((currentBlockingLoader) => ({
          ...currentBlockingLoader,
          actions: [
            {
              label: draftStrings.leaveWithoutSaving,
              type: 'secondary',
              onPress: () => leaveWithoutWaiting(leaveAttempt),
            },
          ],
        })),
      LEAVE_WITHOUT_SAVING_DELAY_MS,
    );
    return leaveAttempt;
  };

  const askToLeaveWithoutSaving = (leaveAction: LeaveAction) => {
    const { draft: draftStrings } = strings.screens.compose_email;
    askInBlockingLoader(draftStrings.saveFailed, [
      { label: draftStrings.keepEditing, type: 'secondary', onPress: hideBlockingLoader },
      {
        label: draftStrings.leaveWithoutSaving,
        type: 'delete',
        onPress: () => {
          hideBlockingLoader();
          leaveNow(leaveAction);
        },
      },
    ]);
  };

  const saveDraftAndLeave = (leaveAttempt: LeaveAttempt) => {
    const { draft: draftStrings } = strings.screens.compose_email;
    setBlockingLoader((currentBlockingLoader) => ({ ...currentBlockingLoader, message: draftStrings.saving }));
    saveDraftNow().then(
      () => leaveWithoutWaiting(leaveAttempt),
      () => {
        if (leaveAttempt.isSettled) {
          return;
        }
        settleLeaveAttempt(leaveAttempt);
        askToLeaveWithoutSaving(leaveAttempt.leaveAction);
      },
    );
  };

  const askToLeaveWithoutFailedAttachments = (leaveAttempt: LeaveAttempt) => {
    const { draft: draftStrings } = strings.screens.compose_email;
    settleLeaveAttempt(leaveAttempt);
    const message =
      failedAttachmentCount === 1
        ? draftStrings.attachmentNotUploaded
        : (strings.formatString(draftStrings.attachmentsNotUploaded, failedAttachmentCount) as string);
    askInBlockingLoader(message, [
      { label: draftStrings.keepEditing, type: 'secondary', onPress: hideBlockingLoader },
      {
        label: draftStrings.leaveWithoutAttachments,
        type: 'delete',
        onPress: () => saveDraftAndLeave(beginLeaveAttempt(leaveAttempt.leaveAction, draftStrings.saving)),
      },
    ]);
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
      .then((openedDraft) => {
        if (isScreenGone) {
          return;
        }
        onDraftOpened(openedDraft);
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

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (removalEvent) => {
        if (isLeaveAllowedRef.current || removalEvent.data.action.type === RESET_ACTION_TYPE) {
          return;
        }
        if (isLeavingBlockedRef.current) {
          removalEvent.preventDefault();
          return;
        }
        const hasUnfinishedAttachments = isEnabled && (isUploadingAttachments || failedAttachmentCount > 0);
        if (!hasUnfinishedAttachments && !hasUnsavedChanges()) {
          return;
        }

        removalEvent.preventDefault();

        if (isEnabled && !isUploadingAttachments && failedAttachmentCount > 0) {
          askToLeaveWithoutFailedAttachments({ leaveAction: removalEvent.data.action, isSettled: false });

          return;
        }
        const { draft: draftStrings } = strings.screens.compose_email;
        const message = isUploadingAttachments ? draftStrings.uploadingAttachments : draftStrings.saving;
        setWaitingLeaveAttempt(beginLeaveAttempt(removalEvent.data.action, message));
      }),
    [navigation, isUploadingAttachments, failedAttachmentCount],
  );

  useEffect(() => {
    isUnmountedRef.current = false;
    return () => {
      isUnmountedRef.current = true;
      clearLeaveWithoutSavingTimeout();
    };
  }, []);

  useEffect(() => {
    if (!waitingLeaveAttempt || waitingLeaveAttempt.isSettled || isUploadingAttachments) {
      return;
    }
    if (failedAttachmentCount > 0) {
      askToLeaveWithoutFailedAttachments(waitingLeaveAttempt);
      return;
    }
    setWaitingLeaveAttempt(null);
    saveDraftAndLeave(waitingLeaveAttempt);
  }, [waitingLeaveAttempt, isUploadingAttachments]);

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
    canDiscardDraft: isEnabled && isDraftLoaded && hasSavedDraft,
    hasFailedToSaveDraft: isEnabled && hasFailedToSave,
    confirmAndDiscardDraft,
    prepareDraftForSending,
    handleFailedSend,
    leaveAfterSending,
    blockingLoaderProps: blockingLoader,
  };
};
