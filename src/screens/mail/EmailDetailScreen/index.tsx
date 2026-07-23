import { EmailResponse } from '@internxt/sdk/dist/mail/types';
import dayjs from 'dayjs';
import { WarningIcon } from 'phosphor-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import {
  decryptAndCacheFullEmail,
  getCachedEmail,
  getPrivateHybridKey,
  isEncryptedEmailBody,
  parseEncryptionBlock,
} from '../../../services/mail/mailCrypto.service';
import strings from '../../../../assets/lang/strings';
import AppScreen from '../../../components/AppScreen';
import AppScreenTitle from '../../../components/AppScreenTitle';
import AppText from '../../../components/AppText';
import useGetColor from '../../../hooks/useColor';
import { useLanguage } from '../../../hooks/useLanguage';
import { mailboxService } from '../../../services/mail/mailbox.service';
import { useAppSelector } from '../../../store/hooks';
import { MailScreenProps } from '../../../types/navigation';
import RenderHtml from 'react-native-render-html';
import { useWindowDimensions, TouchableOpacity } from 'react-native';
import { downloadDecryptAndOpenAttachment } from '../../../services/mail/mailAttachment.service';

export function EmailDetailScreen({ route, navigation }: MailScreenProps<'EmailDetail'>): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const { width } = useWindowDimensions();
  const { user } = useAppSelector((state) => state.auth);
  useLanguage();

  const { emailId } = route.params;
  const [email, setEmail] = useState<EmailResponse | null>(null);
  const [decryptedBody, setDecryptedBody] = useState<string | null>(null);
  const [attachmentsSessionKey, setAttachmentsSessionKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const loadEmail = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    setDecryptedBody(null);
    try {
      const cached = await getCachedEmail(emailId);
      if (cached) {
        setDecryptedBody(cached.text);
        setAttachmentsSessionKey(cached.attachmentsSessionKey);
      }
      const result = await mailboxService.getThread(emailId);
      if (!result) {
        setHasError(true);
        return;
      }
      const message = result.find((m) => m.id === emailId);
      if (!message) {
        setHasError(true);
        return;
      }
      setEmail(message);

      if (!cached && message.textBody && isEncryptedEmailBody(message.textBody) && user?.mnemonic) {
        try {
          const encryption = parseEncryptionBlock(message.textBody);
          const privateKey = await getPrivateHybridKey(user.mnemonic);
          const decrypted = await decryptAndCacheFullEmail(emailId, encryption, privateKey);
          setDecryptedBody(decrypted.text);
          setAttachmentsSessionKey(decrypted.attachmentsSessionKey);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn('Failed to decrypt email body', error);
        }
      }
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [emailId, user]);

  useEffect(() => {
    loadEmail();
  }, [loadEmail]);

  const onBackButtonPressed = () => navigation.goBack();

  const senderLabel = email?.from?.[0]?.name || email?.from?.[0]?.email || '';
  const recipientsLabel = email?.to?.map((recipient) => recipient.name || recipient.email).join(', ') || '';
  const isRawTextEncrypted = !!email?.textBody && isEncryptedEmailBody(email.textBody);
  const resolvedBody = decryptedBody || (!isRawTextEncrypted ? email?.textBody : null) || email?.htmlBody || '';

  return (
    <AppScreen safeAreaTop safeAreaBottom style={tailwind('flex-1 flex-grow')}>
      <AppScreenTitle text={strings.screens.mail.title} onBackButtonPressed={onBackButtonPressed} />

      {isLoading && (
        <View style={tailwind('flex-1 items-center justify-center')}>
          <ActivityIndicator color={getColor('text-primary')} />
        </View>
      )}

      {!isLoading && hasError && (
        <View style={tailwind('flex-1 items-center justify-center')}>
          <WarningIcon color={getColor('text-gray-30')} size={48} />
          <AppText style={[tailwind('mt-3 text-center text-gray-50'), { paddingHorizontal: 32 }]}>
            {strings.errors.generic.title}
          </AppText>
        </View>
      )}

      {!isLoading && !hasError && email && (
        <ScrollView style={tailwind('flex-1 px-4')}>
          <AppText style={[tailwind('text-xl'), { color: getColor('text-gray-100') }]} bold>
            {email.subject}
          </AppText>

          <View style={tailwind('mt-3 flex-row items-center justify-between')}>
            <View style={tailwind('flex-1 mr-2')}>
              <AppText numberOfLines={1} style={[tailwind('text-base'), { color: getColor('text-gray-100') }]}>
                {senderLabel}
              </AppText>
              {!!recipientsLabel && (
                <AppText numberOfLines={1} style={[tailwind('mt-0.5 text-sm'), { color: getColor('text-gray-40') }]}>
                  {recipientsLabel}
                </AppText>
              )}
            </View>
            <AppText style={[tailwind('text-xs'), { color: getColor('text-gray-40') }]}>
              {dayjs(email.receivedAt).format('MMM D, YYYY · h:mm A')}
            </AppText>
          </View>

          <View style={[tailwind('mt-4 pt-4'), { borderTopWidth: 1, borderTopColor: getColor('border-gray-5') }]}>
            <RenderHtml
              contentWidth={width || 1}
              source={{ html: resolvedBody }}
              baseStyle={{ fontSize: 16, color: getColor('text-gray-100'), lineHeight: 22 }}
            />
          </View>
          {email.attachments && email.attachments.length > 0 && (
            <View style={tailwind('mt-4')}>
              {email.attachments.map((attachment) => (
                <TouchableOpacity
                  key={attachment.blobId}
                  style={[
                    tailwind('flex-row items-center py-3'),
                    { borderTopWidth: 1, borderTopColor: getColor('border-gray-5') },
                  ]}
                  onPress={() =>
                    downloadDecryptAndOpenAttachment({
                      emailId,
                      blobId: attachment.blobId,
                      name: attachment.name,
                      type: attachment.type,
                      attachmentsSessionKey,
                    }).catch((error) => {
                      // eslint-disable-next-line no-console
                      console.warn('Failed to open attachment', error);
                    })
                  }
                >
                  <AppText numberOfLines={1} style={[tailwind('flex-1'), { color: getColor('text-primary') }]}>
                    {attachment.name}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </AppScreen>
  );
}
