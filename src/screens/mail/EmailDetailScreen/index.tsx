import { EmailResponse } from '@internxt/sdk/dist/mail/types';
import dayjs from 'dayjs';
import { EnvelopeIcon, TrashIcon, WarningIcon } from 'phosphor-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import RenderHtml from 'react-native-render-html';

import strings from '../../../../assets/lang/strings';
import AppScreen from '../../../components/AppScreen';
import AppScreenTitle from '../../../components/AppScreenTitle';
import AppText from '../../../components/AppText';
import useGetColor from '../../../hooks/useColor';
import { useLanguage } from '../../../hooks/useLanguage';
import { downloadDecryptAndOpenAttachment } from '../../../services/mail/mailAttachment.service';
import {
  decryptAndCacheFullEmail,
  getCachedEmail,
  getPrivateHybridKey,
  isEncryptedEmailBody,
  parseEncryptionBlock,
  markEmailUnread,
  markEmailRead,
  moveThreadToMailbox,
} from '../../../services/mail/mailCrypto.service';
import { mailboxService } from '../../../services/mail/mailbox.service';
import { useAppSelector } from '../../../store/hooks';
import { MailScreenProps } from '../../../types/navigation';

type ResolvedMessage = {
  message: EmailResponse;
  decryptedBody: string | null;
  attachmentsSessionKey: string | null;
};

export function EmailDetailScreen({ route, navigation }: MailScreenProps<'EmailDetail'>): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const { width } = useWindowDimensions();
  const { user } = useAppSelector((state) => state.auth);
  useLanguage();

  const { emailId } = route.params;
  const [thread, setThread] = useState<ResolvedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const hasScrolledToEnd = useRef(false);

  const resolveMessage = useCallback(
    async (message: EmailResponse): Promise<ResolvedMessage> => {
      const cached = await getCachedEmail(message.id);
      if (cached) {
        return { message, decryptedBody: cached.text, attachmentsSessionKey: cached.attachmentsSessionKey };
      }

      if (message.textBody && isEncryptedEmailBody(message.textBody) && user?.mnemonic) {
        try {
          const encryption = parseEncryptionBlock(message.textBody);
          const privateKey = await getPrivateHybridKey(user.mnemonic);
          const decrypted = await decryptAndCacheFullEmail(message.id, encryption, privateKey);
          return { message, decryptedBody: decrypted.text, attachmentsSessionKey: decrypted.attachmentsSessionKey };
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn(`Failed to decrypt message ${message.id}`, error);
        }
      }

      return { message, decryptedBody: null, attachmentsSessionKey: null };
    },
    [user],
  );

  const loadThread = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    hasScrolledToEnd.current = false;
    try {
      const messages = await mailboxService.getThread(emailId);
      if (!messages || messages.length === 0) {
        setHasError(true);
        return;
      }

      const sorted = [...messages].sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());
      const resolved = await Promise.all(sorted.map(resolveMessage));
      setThread(resolved);
      const latest = sorted[sorted.length - 1];
      if (latest && !latest.isRead) {
        markEmailRead(latest.id).catch((error) => {
          // eslint-disable-next-line no-console
          console.warn('Failed to mark email as read', error);
        });
      }
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [emailId, resolveMessage]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  const onBackButtonPressed = () => navigation.goBack();

  const onMarkUnread = async () => {
    const latest = thread[thread.length - 1]?.message;
    if (!latest || isUpdating) return;
    setIsUpdating(true);
    try {
      await markEmailUnread(latest.id);
      navigation.goBack();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to mark email unread', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const onMoveThread = async (mailbox: 'trash' | 'spam') => {
    if (thread.length === 0 || isUpdating) return;
    setIsUpdating(true);
    try {
      await moveThreadToMailbox(
        thread.map((entry) => entry.message.id),
        mailbox,
      );
      navigation.goBack();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`Failed to move thread to ${mailbox}`, error);
    } finally {
      setIsUpdating(false);
    }
  };

  const lastMessageOffsetRef = useRef(0);

  const onScrollContentSizeChange = () => {
    if (!hasScrolledToEnd.current) {
      hasScrolledToEnd.current = true;
      scrollViewRef.current?.scrollTo({ y: lastMessageOffsetRef.current, animated: false });
    }
  };

  const renderMessage = (entry: ResolvedMessage) => {
    const { message, decryptedBody, attachmentsSessionKey } = entry;
    const isLastMessage = thread[thread.length - 1] === entry;
    const senderLabel = message.from?.[0]?.name || message.from?.[0]?.email || '';
    const recipientsLabel = message.to?.map((recipient) => recipient.name || recipient.email).join(', ') || '';
    const isRawTextEncrypted = !!message.textBody && isEncryptedEmailBody(message.textBody);
    const resolvedBody = decryptedBody || (!isRawTextEncrypted ? message.textBody : null) || message.htmlBody || '';

    return (
      <View
        key={message.id}
        onLayout={isLastMessage ? (event) => (lastMessageOffsetRef.current = event.nativeEvent.layout.y) : undefined}
        style={[tailwind('pt-4 pb-4'), { borderBottomWidth: 1, borderBottomColor: getColor('border-gray-5') }]}
      >
        <View style={tailwind('flex-row items-center justify-between')}>
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
            {dayjs(message.receivedAt).format('MMM D, YYYY · h:mm A')}
          </AppText>
        </View>

        <View style={tailwind('mt-3')}>
          <RenderHtml
            contentWidth={width || 1}
            source={{ html: resolvedBody }}
            baseStyle={{ fontSize: 16, color: getColor('text-gray-100'), lineHeight: 22 }}
          />
        </View>

        {message.attachments && message.attachments.length > 0 && (
          <View style={tailwind('mt-3')}>
            {message.attachments.map((attachment) => (
              <TouchableOpacity
                key={attachment.blobId}
                style={[
                  tailwind('flex-row items-center py-3'),
                  { borderTopWidth: 1, borderTopColor: getColor('border-gray-5') },
                ]}
                onPress={() =>
                  downloadDecryptAndOpenAttachment({
                    emailId: message.id,
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
      </View>
    );
  };

  return (
    <AppScreen safeAreaTop safeAreaBottom style={tailwind('flex-1 flex-grow')}>
      <AppScreenTitle
        text={thread[thread.length - 1]?.message.subject || strings.screens.mail.title}
        onBackButtonPressed={onBackButtonPressed}
      />
      {!isLoading && !hasError && thread.length > 0 && (
        <View
          style={[
            tailwind('flex-row items-center justify-around py-2'),
            { borderBottomWidth: 1, borderBottomColor: getColor('border-gray-5') },
          ]}
        >
          <TouchableOpacity onPress={onMarkUnread} disabled={isUpdating} style={tailwind('items-center px-4 py-2')}>
            <EnvelopeIcon color={getColor('text-gray-80')} size={22} />
            <AppText style={[tailwind('text-xs mt-1'), { color: getColor('text-gray-80') }]}>Mark unread</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onMoveThread('spam')}
            disabled={isUpdating}
            style={tailwind('items-center px-4 py-2')}
          >
            <WarningIcon color={getColor('text-gray-80')} size={22} />
            <AppText style={[tailwind('text-xs mt-1'), { color: getColor('text-gray-80') }]}>Spam</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onMoveThread('trash')}
            disabled={isUpdating}
            style={tailwind('items-center px-4 py-2')}
          >
            <TrashIcon color={getColor('text-gray-80')} size={22} />
            <AppText style={[tailwind('text-xs mt-1'), { color: getColor('text-gray-80') }]}>Trash</AppText>
          </TouchableOpacity>
        </View>
      )}
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

      {!isLoading && !hasError && thread.length > 0 && (
        <ScrollView ref={scrollViewRef} style={tailwind('flex-1 px-4')} onContentSizeChange={onScrollContentSizeChange}>
          {thread.map(renderMessage)}
        </ScrollView>
      )}
    </AppScreen>
  );
}
