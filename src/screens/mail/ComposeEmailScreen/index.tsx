import { CaretDownIcon, CaretUpIcon } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import { logger } from '@internxt-mobile/services/common/logger/logger.service';
import { encryptAndSendEmail, encryptAndSendReply } from '@internxt-mobile/services/mail/mailCrypto.service';
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
import { MailAttachment } from '../../../types/mail';
import { RootStackScreenProps } from '../../../types/navigation';
import { ComposeFieldRow } from './components/ComposeFieldRow';
import { composeFieldTextStyle } from './components/composeFieldStyles';
import { RecipientRow } from './components/RecipientRow';
import { describeSendFailure, getSendErrorMessage } from './sendErrors';

const hasSameToAddresses = (composedToAddresses: string[], derivedToAddresses: string[]): boolean =>
  composedToAddresses.length === derivedToAddresses.length &&
  [...composedToAddresses].sort().join() === [...derivedToAddresses].sort().join();

export function ComposeEmailScreen({ route, navigation }: RootStackScreenProps<'ComposeEmail'>): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  useLanguage();

  const reply = route.params?.reply;

  const [to, setTo] = useState<string[]>(reply?.to ?? []);
  const [cc, setCc] = useState<string[]>(reply?.cc ?? []);
  const [bcc, setBcc] = useState<string[]>([]);
  const [isExtraRecipientsSectionOpen, setIsExtraRecipientsSectionOpen] = useState(false);
  const [senderAddress, setSenderAddress] = useState('');
  const [subject, setSubject] = useState(reply?.subject ?? '');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<MailAttachment[]>([]);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    asyncStorageService.getItem(AsyncStorageKey.MyMailEmailAdress).then((address) => setSenderAddress(address ?? ''));
  }, []);

  const onCancel = () => navigation.goBack();

  const onPickAttachment = async () => {
    try {
      const results = await pick({ allowMultiSelection: true });
      setAttachments((prev) => [
        ...prev,
        ...results.map((r) => ({
          uri: r.uri,
          name: r.name ?? 'attachment',
          type: r.type ?? 'application/octet-stream',
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

  const onSend = async () => {
    setIsSending(true);
    let wasSent = false;
    try {
      if (reply) {
        await encryptAndSendReply({
          inReplyTo: reply.repliedMessageId,
          replyAll: reply.replyAll,
          keepServerDerivedRecipients: hasSameToAddresses(to, reply.to),
          to,
          cc,
          bcc,
          subject,
          text: body,
          files: attachments,
        });
      } else {
        await encryptAndSendEmail({ to, cc, bcc, subject, text: body, files: attachments });
      }
      wasSent = true;
    } catch (error) {
      logger.error('Failed to send email', error, describeSendFailure(error));
      Alert.alert(strings.screens.compose_email.errors.title, getSendErrorMessage(error));
    } finally {
      setIsSending(false);
    }

    if (wasSent) {
      navigation.goBack();
    }
  };

  const canSend = to.length > 0 && !!subject && !isSending;
  const hasExtraRecipients = cc.length > 0 || bcc.length > 0;
  const areExtraRecipientsVisible = isExtraRecipientsSectionOpen || hasExtraRecipients;
  const CaretIcon = areExtraRecipientsVisible ? CaretUpIcon : CaretDownIcon;

  return (
    <AppScreen safeAreaTop safeAreaBottom style={tailwind('flex-1 flex-grow')}>
      <AppScreenTitle
        text={reply ? strings.screens.compose_email.replyTitle : strings.screens.compose_email.title}
        onBackButtonPressed={onCancel}
        rightSlot={
          <TouchableOpacity disabled={!canSend} onPress={onSend}>
            <AppText medium style={[{ color: getColor('text-primary') }, !canSend && tailwind('opacity-50')]}>
              {strings.buttons.send}
            </AppText>
          </TouchableOpacity>
        }
      />

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

        <View style={tailwind('px-4')}>
          <AppButton title="Add attachment" type="secondary" onPress={onAddAttachment} />
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
