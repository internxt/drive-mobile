import { CaretDownIcon, CaretUpIcon } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import { logger } from '@internxt-mobile/services/common/logger/logger.service';
import {
  encryptAndSendEmail,
  encryptAndSendForward,
  encryptAndSendReply,
} from '@internxt-mobile/services/mail/mailCrypto.service';
import { hasSameAddresses } from '@internxt-mobile/services/mail/replyRecipients';
import { pick } from '@react-native-documents/picker';
import * as ImagePicker from 'expo-image-picker';
import strings from '../../../../assets/lang/strings';
import AppButton from '../../../components/AppButton';
import AppScreen from '../../../components/AppScreen';
import AppScreenTitle from '../../../components/AppScreenTitle';
import AppText from '../../../components/AppText';
import useGetColor from '../../../hooks/useColor';
import { useLanguage } from '../../../hooks/useLanguage';
import asyncStorageService from '../../../services/AsyncStorageService';
import { AsyncStorageKey } from '../../../types';
import { ForwardedAttachment, MailAttachment, SendStage } from '../../../types/mail';
import { RootStackScreenProps } from '../../../types/navigation';
import { ComposeFieldRow } from './components/ComposeFieldRow';
import { composeFieldTextStyle } from './components/composeFieldStyles';
import { ForwardedQuote } from './components/ForwardedQuote';
import { RecipientRow } from './components/RecipientRow';
import { describeSendFailure, getSendErrorMessage } from './sendErrors';

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

export function ComposeEmailScreen({ route, navigation }: RootStackScreenProps<'ComposeEmail'>): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  useLanguage();

  const params = route.params;
  const reply = params && 'reply' in params ? params.reply : undefined;
  const forward = params && 'forward' in params ? params.forward : undefined;

  const [to, setTo] = useState<string[]>(reply?.to ?? []);
  const [cc, setCc] = useState<string[]>(reply?.cc ?? []);
  const [bcc, setBcc] = useState<string[]>([]);
  const [isExtraRecipientsSectionOpen, setIsExtraRecipientsSectionOpen] = useState(false);
  const [senderAddress, setSenderAddress] = useState('');
  const [subject, setSubject] = useState(reply?.subject ?? forward?.subject ?? '');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<MailAttachment[]>([]);
  const [forwardedAttachments, setForwardedAttachments] = useState<ForwardedAttachment[]>(forward?.attachments ?? []);
  const [isSending, setIsSending] = useState(false);
  const [sendStage, setSendStage] = useState<SendStage | null>(null);

  useEffect(() => {
    asyncStorageService.getItem(AsyncStorageKey.MyMailEmailAdress).then((address) => setSenderAddress(address ?? ''));
  }, []);

  const onCancel = () => navigation.goBack();

  const onPickAttachment = async () => {
    try {
      const results = await pick({ allowMultiSelection: true });
      setAttachments((prev) => [
        ...prev,
        ...results.map((result) => ({
          uri: result.uri,
          name: result.name ?? 'attachment',
          type: result.type ?? 'application/octet-stream',
          size: result.size ?? undefined,
        })),
      ]);
    } catch {
      // user cancelled the picker — nothing to do
    }
  };

  const onPickFromPhotos = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true });
    if (result.canceled) {
      return;
    }
    setAttachments((prev) => [
      ...prev,
      ...result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.fileName ?? `photo-${Date.now()}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
        size: asset.fileSize,
      })),
    ]);
  };

  const onAddAttachment = () => {
    Alert.alert('Add Attachment', undefined, [
      { text: 'Photo Library', onPress: () => setTimeout(onPickFromPhotos, 500) },
      { text: 'Browse Files', onPress: () => setTimeout(onPickAttachment, 500) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const onRemoveAttachment = (uri: string) => {
    setAttachments((prev) => prev.filter((a) => a.uri !== uri));
  };

  const onRemoveForwardedAttachment = (blobId: string) => {
    setForwardedAttachments((prev) => prev.filter((attachment) => attachment.blobId !== blobId));
  };

  const onSend = async () => {
    setIsSending(true);
    let wasSent = false;
    try {
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
            files: attachments,
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
            files: attachments,
          },
          { onStage: setSendStage },
        );
      } else {
        await encryptAndSendEmail({ to, cc, bcc, subject, text: body, files: attachments }, { onStage: setSendStage });
      }
      wasSent = true;
    } catch (error) {
      logger.error('Failed to send email', error, describeSendFailure(error));
      Alert.alert(strings.screens.compose_email.errors.title, getSendErrorMessage(error));
    } finally {
      setIsSending(false);
      setSendStage(null);
    }

    if (wasSent) {
      navigation.goBack();
    }
  };

  const { title, replyTitle, forwardTitle } = strings.screens.compose_email;
  const composeTitle = forward ? forwardTitle : reply ? replyTitle : title;
  const canSend = to.length > 0 && !!subject && !isSending;
  const hasExtraRecipients = cc.length > 0 || bcc.length > 0;
  const areExtraRecipientsVisible = isExtraRecipientsSectionOpen || hasExtraRecipients;
  const CaretIcon = areExtraRecipientsVisible ? CaretUpIcon : CaretDownIcon;

  return (
    <AppScreen safeAreaTop safeAreaBottom style={tailwind('flex-1 flex-grow')}>
      <AppScreenTitle
        text={composeTitle}
        onBackButtonPressed={onCancel}
        rightSlot={
          <TouchableOpacity disabled={!canSend} onPress={onSend}>
            <AppText medium style={[{ color: getColor('text-primary') }, !canSend && tailwind('opacity-50')]}>
              {strings.buttons.send}
            </AppText>
          </TouchableOpacity>
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

      <ScrollView keyboardShouldPersistTaps="handled">
        <RecipientRow
          label={strings.inputs.to}
          recipients={to}
          onChangeRecipients={setTo}
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
            <RecipientRow label={strings.inputs.cc} recipients={cc} onChangeRecipients={setCc} />
            <RecipientRow label={strings.inputs.bcc} recipients={bcc} onChangeRecipients={setBcc} />
          </>
        )}

        {!!senderAddress && (
          <ComposeFieldRow label={strings.inputs.from}>
            <Text style={[composeFieldTextStyle, { color: getColor('text-gray-100') }]}>{senderAddress}</Text>
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

        <TextInput
          accessibilityLabel={strings.inputs.body}
          value={body}
          onChangeText={setBody}
          placeholder={strings.placeholders.emailBody}
          placeholderTextColor={getColor('text-gray-40')}
          multiline
          textAlignVertical="top"
          style={[tailwind('px-4 py-3 text-base'), { minHeight: 200, color: getColor('text-gray-100') }]}
        />

        {!!forward && <ForwardedQuote quote={forward.quote} originalSender={forward.originalSender} />}

        <View style={tailwind('px-4')}>
          <AppButton title="Add attachment" type="secondary" onPress={onAddAttachment} />
          {forwardedAttachments.map((attachment) => (
            <View key={attachment.blobId} style={tailwind('flex-row items-center justify-between py-2')}>
              <AppText numberOfLines={1} style={[tailwind('flex-1 mr-2'), { color: getColor('text-gray-100') }]}>
                {attachment.name}
              </AppText>
              <TouchableOpacity onPress={() => onRemoveForwardedAttachment(attachment.blobId)}>
                <AppText style={{ color: getColor('text-primary') }}>Remove</AppText>
              </TouchableOpacity>
            </View>
          ))}
          {attachments.map((attachment) => (
            <View key={attachment.uri} style={tailwind('flex-row items-center justify-between py-2')}>
              <AppText numberOfLines={1} style={[tailwind('flex-1 mr-2'), { color: getColor('text-gray-100') }]}>
                {attachment.name}
              </AppText>
              <TouchableOpacity onPress={() => onRemoveAttachment(attachment.uri)}>
                <AppText style={{ color: getColor('text-primary') }}>Remove</AppText>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </AppScreen>
  );
}
