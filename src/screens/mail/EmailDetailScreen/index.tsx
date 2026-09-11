import { EmailResponse } from '@internxt/sdk/dist/mail/types';
import { WarningIcon } from 'phosphor-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import { logger } from '@internxt-mobile/services/common/logger/logger.service';
import strings from '../../../../assets/lang/strings';
import AppScreen from '../../../components/AppScreen';
import AppScreenTitle from '../../../components/AppScreenTitle';
import AppText from '../../../components/AppText';
import useGetColor from '../../../hooks/useColor';
import { useLanguage } from '../../../hooks/useLanguage';
import asyncStorageService from '../../../services/AsyncStorageService';
import { type EmailBodySource } from '../../../services/mail/emailBody/emailBodyContent';
import { downloadDecryptAndOpenAttachment } from '../../../services/mail/mailAttachment.service';
import {
  decryptAndCacheFullEmail,
  getCachedEmail,
  getPrivateHybridKey,
  isEncryptedEmailBody,
  markEmailRead,
  markEmailUnread,
  moveThreadToMailbox,
  parseEncryptionBlock,
} from '../../../services/mail/mailCrypto.service';
import { mailboxService } from '../../../services/mail/mailbox.service';
import { deriveReplyRecipients } from '../../../services/mail/replyRecipients';
import { useAppSelector } from '../../../store/hooks';
import { AsyncStorageKey } from '../../../types';
import { MailScreenProps } from '../../../types/navigation';
import { ThreadActions } from './ThreadActions';
import { ThreadMessageCard } from './ThreadMessageCard';

type ResolvedMessage = {
  message: EmailResponse;
  bodySource: EmailBodySource;
  attachmentsSessionKey: string | null;
};

export function EmailDetailScreen({ route, navigation }: MailScreenProps<'EmailDetail'>): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const { user } = useAppSelector((state) => state.auth);
  useLanguage();

  const { emailId } = route.params;
  const [thread, setThread] = useState<ResolvedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [expandedMessageIds, setExpandedMessageIds] = useState<string[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const hasScrolledToEnd = useRef(false);

  const resolveMessage = useCallback(
    async (message: EmailResponse): Promise<ResolvedMessage> => {
      const encryptedEnvelope = message.textBody && isEncryptedEmailBody(message.textBody) ? message.textBody : null;
      const buildResolvedMessage = (
        bodySource: EmailBodySource,
        attachmentsSessionKey: string | null,
      ): ResolvedMessage => ({ message, bodySource, attachmentsSessionKey });

      const cachedEmail = await getCachedEmail(message.id);
      if (cachedEmail) {
        return buildResolvedMessage({ type: 'decrypted', text: cachedEmail.text }, cachedEmail.attachmentsSessionKey);
      }

      if (encryptedEnvelope && user?.mnemonic) {
        try {
          const encryption = parseEncryptionBlock(encryptedEnvelope);
          const privateKey = await getPrivateHybridKey(user.mnemonic);
          const decrypted = await decryptAndCacheFullEmail(message.id, encryption, privateKey);
          return buildResolvedMessage({ type: 'decrypted', text: decrypted.text }, decrypted.attachmentsSessionKey);
        } catch (error) {
          logger.error(`Failed to decrypt message ${message.id}`, error);
        }
      }

      return buildResolvedMessage(encryptedEnvelope ? { type: 'encryptedUnreadable' } : { type: 'plain' }, null);
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
      const resolved = await Promise.all(sorted.map((message) => resolveMessage(message)));
      setThread(resolved);
      const latest = sorted[sorted.length - 1];
      setExpandedMessageIds(latest ? [latest.id] : []);
      if (latest && !latest.isRead) {
        markEmailRead(latest.id).catch((error) => {
          logger.error('Failed to mark email as read', error);
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
      logger.error('Failed to mark email unread', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const onToggleExpanded = (messageId: string) => {
    setExpandedMessageIds((expanded) =>
      expanded.includes(messageId) ? expanded.filter((id) => id !== messageId) : [...expanded, messageId],
    );
  };

  const onReply = async (message: EmailResponse, replyAll: boolean) => {
    if (isUpdating) return;

    const selfAddress = (await asyncStorageService.getItem(AsyncStorageKey.MyMailEmailAdress)) ?? '';
    const { to, cc } = deriveReplyRecipients(message, selfAddress, replyAll);
    const subject = /^\s*re:/i.test(message.subject) ? message.subject : `Re: ${message.subject}`;

    navigation.navigate('ComposeEmail', {
      reply: {
        repliedMessageId: message.id,
        replyAll,
        subject,
        to: to.map((recipient) => recipient.email),
        cc: cc.map((recipient) => recipient.email),
      },
    });
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
      logger.error(`Failed to move thread to ${mailbox}`, error);
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

  const renderMessage = (entry: ResolvedMessage, index: number) => {
    const { message, bodySource, attachmentsSessionKey } = entry;
    const isLastMessage = thread[thread.length - 1] === entry;
    const nextMessage = thread[index + 1]?.message;
    const hasSeparator =
      !expandedMessageIds.includes(message.id) && !!nextMessage && !expandedMessageIds.includes(nextMessage.id);

    const onPressAttachment = (attachment: NonNullable<typeof message.attachments>[number]) => {
      downloadDecryptAndOpenAttachment({
        emailId: message.id,
        blobId: attachment.blobId,
        name: attachment.name,
        type: attachment.type,
        attachmentsSessionKey,
      }).catch((error) => {
        logger.error('Failed to open attachment', error);
      });
    };

    return (
      <View
        key={message.id}
        onLayout={isLastMessage ? (event) => (lastMessageOffsetRef.current = event.nativeEvent.layout.y) : undefined}
      >
        <ThreadMessageCard
          message={message}
          bodySource={bodySource}
          isExpanded={expandedMessageIds.includes(message.id)}
          isBusy={isUpdating}
          hasSeparator={hasSeparator}
          onToggleExpanded={() => onToggleExpanded(message.id)}
          onReply={() => onReply(message, false)}
          onReplyAll={() => onReply(message, true)}
          onPressAttachment={onPressAttachment}
        />
      </View>
    );
  };

  return (
    <AppScreen
      safeAreaTop
      safeAreaBottom
      style={[tailwind('flex-1 flex-grow'), { backgroundColor: getColor('bg-gray-5') }]}
    >
      <AppScreenTitle
        text={thread[thread.length - 1]?.message.subject || strings.screens.mail.title}
        onBackButtonPressed={onBackButtonPressed}
      />
      {!isLoading && !hasError && thread.length > 0 && (
        <ThreadActions
          isDisabled={isUpdating}
          onMarkUnread={onMarkUnread}
          onMoveToSpam={() => onMoveThread('spam')}
          onMoveToTrash={() => onMoveThread('trash')}
        />
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
        <ScrollView
          ref={scrollViewRef}
          style={tailwind('flex-1')}
          contentContainerStyle={tailwind('pt-2')}
          onContentSizeChange={onScrollContentSizeChange}
        >
          {thread.map(renderMessage)}
        </ScrollView>
      )}
    </AppScreen>
  );
}
