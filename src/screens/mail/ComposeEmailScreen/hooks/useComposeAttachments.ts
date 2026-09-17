import type { AttachmentRef } from '@internxt/sdk/dist/mail/types';
import { base64ToUint8Array, genSymmetricKey, uint8ArrayToBase64 } from 'internxt-crypto';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import uuid from 'react-native-uuid';

import { HTTP_PAYLOAD_TOO_LARGE } from '@internxt-mobile/services/common/httpStatusCodes';
import { logger } from '@internxt-mobile/services/common/logger/logger.service';
import { isAttachmentTooLarge } from '@internxt-mobile/services/mail/attachmentLimits';
import { describeErrorForLog, readHttpStatus } from '@internxt-mobile/services/mail/errorDescription';
import { AttachmentTooLargeError, AttachmentUploadAbortedError } from '@internxt-mobile/services/mail/errors';
import { uploadAttachment } from '@internxt-mobile/services/mail/mailCrypto.service';
import { MailAttachment, UploadedAttachments } from '../../../../types/mail';

export const ATTACHMENT_UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;

type AttachmentUploadFailure = 'tooLarge' | 'notUploaded';

export type ComposeAttachment =
  | { id: string; name: string; status: 'uploading'; file: MailAttachment }
  | { id: string; name: string; status: 'failed'; file: MailAttachment; failure: AttachmentUploadFailure }
  | { id: string; name: string; status: 'uploaded'; uploadedAttachment: AttachmentRef };

type ComposeAttachmentsState = {
  attachmentsSessionKey: string;
  attachments: ComposeAttachment[];
};

const letTheInterfaceCatchUp = (): Promise<void> =>
  new Promise((resolve) => {
    if (AppState.currentState === 'active') {
      requestAnimationFrame(() => setTimeout(resolve, 0));
    } else {
      setTimeout(resolve, 0);
    }
  });

const rejectWhenAborted = (abortSignal: AbortSignal): Promise<never> =>
  new Promise((_resolve, reject) => {
    abortSignal.addEventListener('abort', () => reject(new AttachmentUploadAbortedError()));
  });

const isRefusedAsTooLarge = (error: unknown): boolean =>
  error instanceof AttachmentTooLargeError || readHttpStatus(error) === HTTP_PAYLOAD_TOO_LARGE;

/**
 * Holds the attachments of a message being written and uploads each of them as soon as it is added,
 * one after another, all encrypted with the same key. An upload is aborted when its file is removed,
 * when the message is closed, or when it takes longer than allowed.
 *
 * @returns The attachments with how their upload is going, what is already uploaded, whether anything is
 * still uploading, how many uploads failed, and the actions that add, retry, remove and load attachments.
 */
export const useComposeAttachments = () => {
  const [attachmentsState, setAttachmentsState] = useState<ComposeAttachmentsState>(() => ({
    attachmentsSessionKey: uint8ArrayToBase64(genSymmetricKey()),
    attachments: [],
  }));
  const latestAttachmentsStateRef = useRef(attachmentsState);
  const uploadQueueRef = useRef<Promise<void>>(Promise.resolve());
  const uploadAbortControllersRef = useRef(new Map<string, AbortController>());
  const isUnmountedRef = useRef(false);

  useEffect(() => {
    isUnmountedRef.current = false;
    const uploadAbortControllers = uploadAbortControllersRef.current;
    return () => {
      isUnmountedRef.current = true;
      uploadAbortControllers.forEach((uploadAbortController) => uploadAbortController.abort());
    };
  }, []);

  const updateAttachmentsState = (
    stateUpdater: (currentAttachmentsState: ComposeAttachmentsState) => ComposeAttachmentsState,
  ) => {
    const updatedAttachmentsState = stateUpdater(latestAttachmentsStateRef.current);
    latestAttachmentsStateRef.current = updatedAttachmentsState;
    setAttachmentsState(updatedAttachmentsState);
  };

  const replaceAttachment = (replacement: ComposeAttachment) => {
    updateAttachmentsState((currentAttachmentsState) => ({
      ...currentAttachmentsState,
      attachments: currentAttachmentsState.attachments.map((attachment) =>
        attachment.id === replacement.id ? replacement : attachment,
      ),
    }));
  };

  const findUploadingAttachment = (attachmentId: string) =>
    latestAttachmentsStateRef.current.attachments.find(
      (attachment): attachment is Extract<ComposeAttachment, { status: 'uploading' }> =>
        attachment.id === attachmentId && attachment.status === 'uploading',
    );

  const uploadWhenItsTurnComes = (attachmentId: string) => {
    uploadQueueRef.current = uploadQueueRef.current.then(async () => {
      await letTheInterfaceCatchUp();
      const attachmentToUpload = findUploadingAttachment(attachmentId);
      if (!attachmentToUpload || isUnmountedRef.current) {
        return;
      }

      const { id, name, file } = attachmentToUpload;
      const uploadAbortController = new AbortController();
      uploadAbortControllersRef.current.set(id, uploadAbortController);
      let hasTimedOut = false;
      const uploadTimeout = setTimeout(() => {
        hasTimedOut = true;
        uploadAbortController.abort();
      }, ATTACHMENT_UPLOAD_TIMEOUT_MS);
      try {
        const attachmentsSessionKey = base64ToUint8Array(latestAttachmentsStateRef.current.attachmentsSessionKey);
        const uploadInProgress = uploadAttachment(file, attachmentsSessionKey, uploadAbortController.signal);
        uploadInProgress.catch(() => undefined);
        const uploadedAttachment = await Promise.race([
          uploadInProgress,
          rejectWhenAborted(uploadAbortController.signal),
        ]);
        if (findUploadingAttachment(id)) {
          replaceAttachment({ id, name, status: 'uploaded', uploadedAttachment });
        }
      } catch (error) {
        const isAttachmentStillWaitingForThisUpload = !!findUploadingAttachment(id);
        if (hasTimedOut) {
          logger.warn('An attachment upload took too long and was aborted');
        } else if (!(error instanceof AttachmentUploadAbortedError)) {
          logger.error('Failed to upload an attachment', describeErrorForLog(error));
        }
        if (isAttachmentStillWaitingForThisUpload) {
          const failure = isRefusedAsTooLarge(error) ? 'tooLarge' : 'notUploaded';
          replaceAttachment({ id, name, status: 'failed', file, failure });
        }
      } finally {
        clearTimeout(uploadTimeout);
        uploadAbortControllersRef.current.delete(id);
      }
    });
  };

  const addFiles = (files: MailAttachment[]): MailAttachment[] => {
    const addedAttachments: ComposeAttachment[] = files
      .filter((file) => !isAttachmentTooLarge(file))
      .map((file) => ({ id: uuid.v4() as string, name: file.name, status: 'uploading', file }));

    updateAttachmentsState((currentAttachmentsState) => ({
      ...currentAttachmentsState,
      attachments: [...currentAttachmentsState.attachments, ...addedAttachments],
    }));
    addedAttachments.forEach((attachment) => uploadWhenItsTurnComes(attachment.id));

    return files.filter(isAttachmentTooLarge);
  };

  const retryAttachment = (attachmentId: string) => {
    const failedAttachment = latestAttachmentsStateRef.current.attachments.find(
      (attachment) => attachment.id === attachmentId,
    );
    if (failedAttachment?.status !== 'failed' || failedAttachment.failure !== 'notUploaded') {
      return;
    }
    const { id, name, file } = failedAttachment;
    replaceAttachment({ id, name, status: 'uploading', file });
    uploadWhenItsTurnComes(attachmentId);
  };

  const removeAttachment = (attachmentId: string) => {
    updateAttachmentsState((currentAttachmentsState) => ({
      ...currentAttachmentsState,
      attachments: currentAttachmentsState.attachments.filter((attachment) => attachment.id !== attachmentId),
    }));
    uploadAbortControllersRef.current.get(attachmentId)?.abort();
  };

  const loadUploadedAttachments = ({ attachmentsSessionKey, attachments }: UploadedAttachments) => {
    updateAttachmentsState(() => ({
      attachmentsSessionKey,
      attachments: attachments.map((uploadedAttachment) => ({
        id: uploadedAttachment.blobId,
        name: uploadedAttachment.name,
        status: 'uploaded',
        uploadedAttachment,
      })),
    }));
  };

  const uploadedAttachments: UploadedAttachments = {
    attachmentsSessionKey: attachmentsState.attachmentsSessionKey,
    attachments: attachmentsState.attachments.flatMap((attachment) =>
      attachment.status === 'uploaded' ? [attachment.uploadedAttachment] : [],
    ),
  };

  return {
    attachments: attachmentsState.attachments,
    uploadedAttachments,
    isUploadingAttachments: attachmentsState.attachments.some((attachment) => attachment.status === 'uploading'),
    failedAttachmentCount: attachmentsState.attachments.filter((attachment) => attachment.status === 'failed').length,
    addFiles,
    retryAttachment,
    removeAttachment,
    loadUploadedAttachments,
  };
};
