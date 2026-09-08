import { useState } from 'react';
import { ScrollView, View, TouchableOpacity, Alert } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import strings from '../../../../assets/lang/strings';
import AppButton from '../../../components/AppButton';
import AppScreen from '../../../components/AppScreen';
import AppScreenTitle from '../../../components/AppScreenTitle';
import AppTextInput from '../../../components/AppTextInput';
import useGetColor from '../../../hooks/useColor';
import { useLanguage } from '../../../hooks/useLanguage';
import { RootStackScreenProps } from '../../../types/navigation';
import * as ImagePicker from 'expo-image-picker';
import { pick } from '@react-native-documents/picker';
import AppText from '../../../components/AppText';
import { encryptAndSendEmail } from '@internxt-mobile/services/mail/mailCrypto.service';
import { InternxtRecipientKeyMissingError, MailErrorName } from '@internxt-mobile/services/mail/errors';
import { logger } from '@internxt-mobile/services/common/logger/logger.service';

type PickedAttachment = { uri: string; name: string; type: string };
type SendErrorMessages = typeof strings.screens.compose_email.errors;

/**
 * Pulls the server side of a failed request out of an SDK error, which carries the
 * response body and request id that the error message alone does not include.
 *
 * @param error - Error thrown by the mail SDK.
 * @returns The status, response body and request id, when the error carries them.
 */
const describeRequestFailure = (error: unknown): Record<string, unknown> => {
  const cause = (error as { cause?: unknown })?.cause;
  const source = (cause ?? error ?? {}) as { status?: number; data?: unknown; xRequestId?: string };

  return { status: source.status, responseBody: source.data, requestId: source.xRequestId, cause };
};

export const SEND_ERROR_MESSAGES = new Map<string, (error: Error, messages: SendErrorMessages) => string>([
  [MailErrorName.NoRecipients, (_, messages) => messages.noRecipients],
  [
    MailErrorName.InternxtRecipientKeyMissing,
    (error, messages) =>
      error instanceof InternxtRecipientKeyMissingError
        ? (strings.formatString(messages.internxtKeyMissing, error.addresses.join(', ')) as string)
        : messages.sendFailed,
  ],
  [MailErrorName.RecipientKeyLookupFailed, (_, messages) => messages.keyLookupFailed],
  [MailErrorName.ActiveDomainsUnavailable, (_, messages) => messages.domainsUnavailable],
  [MailErrorName.ServerPublicKeyMissing, (_, messages) => messages.serverKeyMissing],
]);

/**
 * Turns a send failure into the reason shown to the user.
 *
 * @param error - Error thrown while sending.
 * @returns The localized reason, or the generic one when the failure is not a known mail error.
 */
export const getSendErrorMessage = (error: unknown): string => {
  const messages = strings.screens.compose_email.errors;
  if (!(error instanceof Error)) {
    return messages.sendFailed;
  }

  const messageResolver = SEND_ERROR_MESSAGES.get(error.name);

  return messageResolver ? messageResolver(error, messages) : messages.sendFailed;
};

export function ComposeEmailScreen({ navigation }: RootStackScreenProps<'ComposeEmail'>): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  useLanguage();

  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<PickedAttachment[]>([]);
  const [isSending, setIsSending] = useState(false);

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
      const toAddresses = to
        .split(',')
        .map((email) => email.trim())
        .filter((email) => email.length > 0);

      await encryptAndSendEmail(toAddresses, subject, body, attachments);
      wasSent = true;
    } catch (error) {
      logger.error('Failed to send email', error, describeRequestFailure(error));
      Alert.alert(strings.screens.compose_email.errors.title, getSendErrorMessage(error));
    } finally {
      setIsSending(false);
    }

    if (wasSent) {
      navigation.goBack();
    }
  };
  return (
    <AppScreen safeAreaTop safeAreaBottom style={tailwind('flex-1 flex-grow')}>
      <AppScreenTitle text={strings.screens.compose_email.title} onBackButtonPressed={onCancel} />

      <ScrollView style={tailwind('px-4')} keyboardShouldPersistTaps="handled">
        <AppTextInput
          containerStyle={tailwind('mb-4')}
          label={strings.inputs.to}
          value={to}
          onChangeText={setTo}
          placeholder={strings.placeholders.emailRecipient}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />
        <AppTextInput
          containerStyle={tailwind('mb-4')}
          label={strings.inputs.subject}
          value={subject}
          onChangeText={setSubject}
          placeholder={strings.placeholders.emailSubject}
        />
        <AppTextInput
          containerStyle={tailwind('mb-4')}
          wrapperStyle={{ minHeight: 160, alignItems: 'flex-start' }}
          label={strings.inputs.body}
          value={body}
          onChangeText={setBody}
          placeholder={strings.placeholders.emailBody}
          multiline
          textAlignVertical="top"
          style={{ minHeight: 160, color: getColor('text-gray-100') }}
        />
        <AppButton title="Add attachment" type="secondary" onPress={onAddAttachment} />
        {attachments.map((a) => (
          <View key={a.uri} style={tailwind('flex-row items-center justify-between py-2')}>
            <AppTextInput
              editable={false}
              value={a.name}
              containerStyle={tailwind('flex-1 mr-2')}
              style={{ color: getColor('text-gray-100') }}
            />
            <TouchableOpacity onPress={() => onRemoveAttachment(a.uri)}>
              <AppText style={{ color: getColor('text-primary') }}>Remove</AppText>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
      <View style={[tailwind('px-4 pt-3'), { borderTopWidth: 1, borderTopColor: getColor('border-gray-5') }]}>
        <AppButton
          title={strings.buttons.send}
          type="accept"
          onPress={onSend}
          disabled={!to || !subject || isSending}
        />
      </View>
    </AppScreen>
  );
}
