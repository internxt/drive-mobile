import { CaretDownIcon, CaretUpIcon, LockKeyIcon, TrashIcon } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import { logger } from '@internxt-mobile/services/common/logger/logger.service';
import { formatMaxAttachmentSize } from '@internxt-mobile/services/mail/attachmentLimits';
import { describeErrorForLog } from '@internxt-mobile/services/mail/errorDescription';
import { mailboxService } from '@internxt-mobile/services/mail/mailbox.service';
import {
  encryptAndSendEmail,
  encryptAndSendForward,
  encryptAndSendReply,
} from '@internxt-mobile/services/mail/mailCrypto.service';
import { MailDomain } from '@internxt-mobile/services/mail/mailDomain';
import { hasSameAddresses } from '@internxt-mobile/services/mail/replyRecipients';
import { errorCodes, isErrorWithCode, pick } from '@react-native-documents/picker';
import * as ImagePicker from 'expo-image-picker';
import strings from '../../../../assets/lang/strings';
import AppButton from '../../../components/AppButton';
import AppScreen from '../../../components/AppScreen';
import AppScreenTitle from '../../../components/AppScreenTitle';
import AppText from '../../../components/AppText';
import useGetColor from '../../../hooks/useColor';
import { useLanguage } from '../../../hooks/useLanguage';
import asyncStorageService from '../../../services/AsyncStorageService';
import { notifications } from '../../../services/NotificationsService';
import { useAppSelector } from '../../../store/hooks';
import { AsyncStorageKey } from '../../../types';
import { ForwardedAttachment, MailAttachment, SendStage } from '../../../types/mail';
import { RootStackScreenProps } from '../../../types/navigation';
import { BlockingLoaderModal } from './components/BlockingLoaderModal';
import { ComposeAttachmentRow } from './components/ComposeAttachmentRow';
import { ComposeBodyEditor } from './components/ComposeBodyEditor';
import { ComposeFieldRow } from './components/ComposeFieldRow';
import { composeFieldTextStyle } from './components/composeFieldStyles';
import { ForwardedQuote } from './components/ForwardedQuote';
import { RecipientRow } from './components/RecipientRow';
import { useComposeAttachments } from './hooks/useComposeAttachments';
import { useComposeRecipients } from './hooks/useComposeRecipients';
import { useDraftLifecycle } from './hooks/useDraftLifecycle';
import {
  RecipientField,
  addEveryTypedRecipient,
  canSendMessage,
  hasCopyOrBlindCopyRecipients,
  isEndToEndEncrypted,
} from './utils/composeRecipients';

const describeSendStage = (stage: SendStage): string => {
  const { progress } = strings.screens.compose_email;

  switch (stage.name) {
    case 'downloadingAttachments':
      return strings.formatString(progress.downloadingAttachments, stage.current, stage.total) as string;
    case 'uploadingAttachments':
      return strings.formatString(progress.uploadingAttachments, stage.current, stage.total) as string;
    case 'sending':
      return progress.sending;
  }
};

export const ComposeEmailScreen = ({ route, navigation }: RootStackScreenProps<'ComposeEmail'>): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const { user } = useAppSelector((state) => state.auth);
  useLanguage();

  const params = route.params;
  const reply = params && 'reply' in params ? params.reply : undefined;
  const forward = params && 'forward' in params ? params.forward : undefined;
  const draftToOpen = params && 'draft' in params ? params.draft : undefined;
  const isDraftKept = !reply && !forward;

  const {
    recipients,
    pendingText,
    changePendingText,
    addTypedRecipients,
    removeRecipient,
    replaceRecipients,
    resolveRecipientsForSending,
  } = useComposeRecipients({
    to: reply?.to,
    cc: reply?.cc,
  });
  const [activeDomains, setActiveDomains] = useState<MailDomain[] | null>(null);
  const [isExtraRecipientsSectionOpen, setIsExtraRecipientsSectionOpen] = useState(false);
  const [senderAddress, setSenderAddress] = useState('');
  const [subject, setSubject] = useState(reply?.subject ?? forward?.subject ?? '');
  const [body, setBody] = useState('');
  const [isBodyReady, setIsBodyReady] = useState(false);
  const [forwardedAttachments, setForwardedAttachments] = useState<ForwardedAttachment[]>(forward?.attachments ?? []);
  const [isSending, setIsSending] = useState(false);
  const [sendStage, setSendStage] = useState<SendStage | null>(null);
  const isSendInProgressRef = useRef(false);

  const {
    attachments,
    uploadedAttachments,
    isUploadingAttachments,
    failedAttachmentCount,
    addFiles,
    retryAttachment,
    removeAttachment,
    loadUploadedAttachments,
  } = useComposeAttachments();

  const {
    isDraftLoaded,
    canDiscardDraft,
    hasFailedToSaveDraft,
    confirmAndDiscardDraft,
    prepareDraftForSending,
    handleFailedSend,
    leaveAfterSending,
    blockingLoaderProps,
  } = useDraftLifecycle({
    navigation,
    draftToOpen,
    isEnabled: isDraftKept,
    mnemonic: user?.mnemonic,
    recipients: addEveryTypedRecipient(recipients, pendingText).recipients,
    subject,
    body,
    isBodyReady,
    draftAttachments: uploadedAttachments,
    isUploadingAttachments,
    failedAttachmentCount,
    onDraftOpened: (openedDraft) => {
      replaceRecipients({ to: openedDraft.to, cc: openedDraft.cc, bcc: openedDraft.bcc });
      setSubject(openedDraft.subject);
      setBody(openedDraft.body);
      if (openedDraft.draftAttachments) {
        loadUploadedAttachments(openedDraft.draftAttachments);
      }
    },
  });

  useEffect(() => {
    asyncStorageService.getItem(AsyncStorageKey.MyMailEmailAdress).then((address) => setSenderAddress(address ?? ''));
    mailboxService
      .getActiveDomains()
      .then(setActiveDomains)
      .catch((error) => logger.error('Failed to fetch the active mail domains', error));
  }, []);

  const onCancel = () => navigation.goBack();

  const addPickedFiles = (pickedFiles: MailAttachment[]) => {
    const refusedFiles = addFiles(pickedFiles);
    const { errors } = strings.screens.compose_email;
    refusedFiles.forEach((refusedFile) =>
      notifications.error(
        strings.formatString(errors.attachmentTooLarge, refusedFile.name, formatMaxAttachmentSize()) as string,
      ),
    );
  };

  const onPickAttachment = async () => {
    let pickedFiles: Awaited<ReturnType<typeof pick>>;
    try {
      pickedFiles = await pick({ allowMultiSelection: true });
    } catch (error) {
      if (!(isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED)) {
        logger.error('Failed to pick attachments', describeErrorForLog(error));
        notifications.error(strings.screens.compose_email.attachments.pickFailed);
      }
      return;
    }
    const readablePickedFiles = pickedFiles.filter((pickedFile) => !pickedFile.error && !pickedFile.isVirtual);
    if (readablePickedFiles.length < pickedFiles.length) {
      logger.warn('Some picked files cannot be read', {
        unreadableFileCount: pickedFiles.length - readablePickedFiles.length,
      });
      notifications.error(strings.screens.compose_email.attachments.pickFailed);
    }
    addPickedFiles(
      readablePickedFiles.map((pickedFile) => ({
        uri: pickedFile.uri,
        name: pickedFile.name ?? 'attachment',
        type: pickedFile.type ?? 'application/octet-stream',
        size: pickedFile.size ?? undefined,
      })),
    );
  };

  const onPickFromPhotos = async () => {
    try {
      const photoPickerResult = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true });
      if (photoPickerResult.canceled) {
        return;
      }
      addPickedFiles(
        photoPickerResult.assets.map((asset) => ({
          uri: asset.uri,
          name: asset.fileName ?? `photo-${Date.now()}.jpg`,
          type: asset.mimeType ?? 'image/jpeg',
          size: asset.fileSize,
        })),
      );
    } catch (error) {
      logger.error('Failed to pick photos', describeErrorForLog(error));
      notifications.error(strings.screens.compose_email.attachments.pickFailed);
    }
  };

  const onAddAttachment = () => {
    Alert.alert('Add Attachment', undefined, [
      { text: 'Photo Library', onPress: () => setTimeout(onPickFromPhotos, 500) },
      { text: 'Browse Files', onPress: () => setTimeout(onPickAttachment, 500) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const onRemoveForwardedAttachment = (blobId: string) => {
    setForwardedAttachments((prev) => prev.filter((attachment) => attachment.blobId !== blobId));
  };

  const onSend = async () => {
    if (isSendInProgressRef.current) {
      return;
    }
    const { recipients: recipientsForSending, unreadableRecipientText } = resolveRecipientsForSending();
    if (unreadableRecipientText.length > 0) {
      const { errors } = strings.screens.compose_email;
      Alert.alert(
        errors.title,
        strings.formatString(errors.unreadableRecipient, unreadableRecipientText.join(', ')) as string,
      );
      return;
    }
    const { to, cc, bcc } = recipientsForSending;
    isSendInProgressRef.current = true;
    setIsSending(true);
    let wasSent = false;
    try {
      const draftIdForSending = await prepareDraftForSending();
      if (forward) {
        await encryptAndSendForward(
          {
            forwardedMessageId: forward.forwardedMessageId,
            note: body,
            quote: forward.quote,
            forwardedAttachments,
            areAttachmentsEncrypted: forward.areAttachmentsEncrypted,
            to,
            cc,
            bcc,
            subject,
            uploadedAttachments,
          },
          { onStage: setSendStage },
        );
      } else if (reply) {
        await encryptAndSendReply(
          {
            inReplyTo: reply.repliedMessageId,
            replyAll: reply.replyAll,
            keepServerDerivedRecipients: hasSameAddresses(to, reply.to),
            to,
            cc,
            bcc,
            subject,
            text: body,
            uploadedAttachments,
          },
          { onStage: setSendStage },
        );
      } else {
        await encryptAndSendEmail(
          {
            to,
            cc,
            bcc,
            subject,
            text: body,
            draftId: draftIdForSending,
            uploadedAttachments,
          },
          { onStage: setSendStage },
        );
      }
      wasSent = true;
    } catch (error) {
      logger.error('Failed to send email', describeErrorForLog(error));
      Alert.alert(strings.screens.compose_email.errors.title, await handleFailedSend(error));
    } finally {
      isSendInProgressRef.current = false;
      setIsSending(false);
      setSendStage(null);
    }

    if (wasSent) {
      leaveAfterSending();
    }
  };

  const { title, replyTitle, forwardTitle } = strings.screens.compose_email;
  const composeTitle = forward ? forwardTitle : reply ? replyTitle : title;
  const canSend =
    isDraftLoaded &&
    !isUploadingAttachments &&
    failedAttachmentCount === 0 &&
    canSendMessage({ recipients, pendingText, isSending });
  const hasExtraRecipients = hasCopyOrBlindCopyRecipients(recipients, pendingText);
  const isMessageEndToEndEncrypted = isEndToEndEncrypted(recipients, pendingText, activeDomains);

  const recipientRowPropsForField = (field: RecipientField) => ({
    recipients: recipients[field],
    pendingText: pendingText[field],
    onChangePendingText: (typedText: string) => changePendingText(field, typedText),
    onFinishEntry: (typedText: string) => addTypedRecipients(field, typedText),
    onRemoveRecipient: (address: string) => removeRecipient(field, address),
  });
  const areExtraRecipientsVisible = isExtraRecipientsSectionOpen || hasExtraRecipients;
  const CaretIcon = areExtraRecipientsVisible ? CaretUpIcon : CaretDownIcon;

  return (
    <AppScreen safeAreaTop safeAreaBottom style={tailwind('flex-1 flex-grow')}>
      <AppScreenTitle
        text={composeTitle}
        onBackButtonPressed={onCancel}
        rightSlot={
          <View style={tailwind('flex-row items-center')}>
            {canDiscardDraft && !isSending && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={strings.screens.compose_email.draft.discard}
                onPress={confirmAndDiscardDraft}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={tailwind('mr-4')}
              >
                <TrashIcon size={22} color={getColor('text-gray-60')} />
              </TouchableOpacity>
            )}
            <TouchableOpacity disabled={!canSend} onPress={onSend}>
              <AppText medium style={[{ color: getColor('text-primary') }, !canSend && tailwind('opacity-50')]}>
                {strings.buttons.send}
              </AppText>
            </TouchableOpacity>
          </View>
        }
      />

      {!!sendStage && (
        <View style={[tailwind('flex-row items-center px-4 py-2'), { backgroundColor: getColor('bg-gray-5') }]}>
          <ActivityIndicator size="small" color={getColor('text-primary')} />
          <AppText style={[tailwind('ml-2 text-sm'), { color: getColor('text-gray-60') }]}>
            {describeSendStage(sendStage)}
          </AppText>
        </View>
      )}

      {hasFailedToSaveDraft && (
        <AppText style={[tailwind('px-4 py-2 text-sm'), { color: getColor('text-red') }]}>
          {strings.screens.compose_email.draft.notSaved}
        </AppText>
      )}

      {!isDraftLoaded ? (
        <View style={tailwind('flex-1 items-center justify-center')}>
          <ActivityIndicator color={getColor('text-primary')} />
        </View>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled">
          <RecipientRow
            label={strings.inputs.to}
            {...recipientRowPropsForField('to')}
            renderAppend={
              !hasExtraRecipients && (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`${strings.inputs.cc} · ${strings.inputs.bcc}`}
                  onPress={() => setIsExtraRecipientsSectionOpen(!isExtraRecipientsSectionOpen)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={tailwind('pl-2 py-1')}
                >
                  <CaretIcon size={20} color={getColor('text-gray-50')} />
                </TouchableOpacity>
              )
            }
          />

          {areExtraRecipientsVisible && (
            <>
              <RecipientRow label={strings.inputs.cc} {...recipientRowPropsForField('cc')} />
              <RecipientRow label={strings.inputs.bcc} {...recipientRowPropsForField('bcc')} />
            </>
          )}

          {!!senderAddress && (
            <ComposeFieldRow
              label={strings.inputs.from}
              renderAppend={
                isMessageEndToEndEncrypted && (
                  <View
                    style={[
                      tailwind('flex-row items-center rounded-full px-2 py-1 ml-2'),
                      { borderWidth: 1, borderColor: getColor('border-green') },
                    ]}
                  >
                    <LockKeyIcon size={12} weight="fill" color={getColor('text-green')} />
                    <AppText style={[tailwind('ml-1 text-xs'), { color: getColor('text-green') }]}>
                      {strings.screens.compose_email.endToEndEncrypted}
                    </AppText>
                  </View>
                )
              }
            >
              <Text numberOfLines={1} style={[composeFieldTextStyle, { color: getColor('text-gray-100') }]}>
                {senderAddress}
              </Text>
            </ComposeFieldRow>
          )}

          <ComposeFieldRow label={strings.inputs.subject}>
            <TextInput
              accessibilityLabel={strings.inputs.subject}
              value={subject}
              onChangeText={setSubject}
              placeholder={strings.placeholders.emailSubject}
              placeholderTextColor={getColor('text-gray-40')}
              style={[composeFieldTextStyle, { color: getColor('text-gray-100') }]}
            />
          </ComposeFieldRow>

          <ComposeBodyEditor initialBody={body} onChangeBody={setBody} onReady={() => setIsBodyReady(true)} />

          {!!forward && <ForwardedQuote quote={forward.quote} originalSender={forward.originalSender} />}

          <View style={tailwind('px-4')}>
            <AppButton title="Add attachment" type="secondary" disabled={isSending} onPress={onAddAttachment} />
            {forwardedAttachments.map((attachment) => (
              <ComposeAttachmentRow
                key={attachment.blobId}
                attachment={{
                  id: attachment.blobId,
                  name: attachment.name,
                  status: 'uploaded',
                  uploadedAttachment: attachment,
                }}
                disabled={isSending}
                onRemove={() => onRemoveForwardedAttachment(attachment.blobId)}
              />
            ))}
            {attachments.map((attachment) => (
              <ComposeAttachmentRow
                key={attachment.id}
                attachment={attachment}
                disabled={isSending}
                onRetry={() => retryAttachment(attachment.id)}
                onRemove={() => removeAttachment(attachment.id)}
              />
            ))}
            {failedAttachmentCount > 0 && (
              <AppText style={[tailwind('mt-2 text-xs'), { color: getColor('text-gray-50') }]}>
                {strings.screens.compose_email.attachments.removeFailedToSend}
              </AppText>
            )}
          </View>
        </ScrollView>
      )}

      <BlockingLoaderModal {...blockingLoaderProps} />
    </AppScreen>
  );
};
