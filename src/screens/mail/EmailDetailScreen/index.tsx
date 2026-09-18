import { EmailResponse } from '@internxt/sdk/dist/mail/types';
import { WarningIcon } from 'phosphor-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { buildForwardedQuote, forwardedSubject } from '../../../services/mail/forwardBody';
import { mailboxService } from '../../../services/mail/mailbox.service';
import {
  decryptAndCacheFullEmail,
  getCachedEmail,
  getPrivateHybridKey,
  isEncryptedEmailBody,
  parseEncryptionBlock,
} from '../../../services/mail/mailCrypto.service';
import { deriveReplyRecipients } from '../../../services/mail/replyRecipients';
import { useAppSelector } from '../../../store/hooks';
import { AsyncStorageKey } from '../../../types';
import { MailScreenProps } from '../../../types/navigation';
import { useEmailThreadMailboxActions } from './hooks/useEmailThreadMailboxActions';
import { useOpenAttachment } from './hooks/useOpenAttachment';
import { MessageFooterBar } from './MessageFooterBar';
import { ThreadActions } from './ThreadActions';
import { ThreadMessageCard } from './ThreadMessageCard';

type ResolvedMessage = {
  message: EmailResponse;
  bodySource: EmailBodySource;
  attachmentsSessionKey: string | null;
};

export const EmailDetailScreen = ({ route, navigation }: MailScreenProps<'EmailDetail'>): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const { user } = useAppSelector((state) => state.auth);
  useLanguage();

  const { emailId, mailboxId } = route.params;
  const [thread, setThread] = useState<ResolvedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [expandedMessageIds, setExpandedMessageIds] = useState<string[]>([]);
  const [selfAddress, setSelfAddress] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const hasScrolledToEnd = useRef(false);
  const lastMessageOffsetRef = useRef(0);
  const { openingAttachmentId, openAttachment } = useOpenAttachment();

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
      const resolved = await Promise.all(sorted.map(resolveMessage));
      setThread(resolved);
      const latest = sorted[sorted.length - 1];
      setExpandedMessageIds(latest ? [latest.id] : []);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [emailId, resolveMessage]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  useEffect(() => {
    asyncStorageService.getItem(AsyncStorageKey.MyMailEmailAdress).then((address) => setSelfAddress(address ?? ''));
  }, []);

  const threadMessages = useMemo(() => thread.map((entry) => entry.message), [thread]);
  const latestEntry = thread[thread.length - 1];

  const canReplyAllTo = (message: EmailResponse) => deriveReplyRecipients(message, selfAddress, true).cc.length > 0;

  const onReadStateChanged = useCallback((messageId: string, isRead: boolean) => {
    setThread((entries) =>
      entries.map((entry) =>
        entry.message.id === messageId ? { ...entry, message: { ...entry.message, isRead } } : entry,
      ),
    );
  }, []);

  const { messagesInMailbox, isUpdating, markUnread, moveThread, restoreThread, confirmAndDeleteThreadPermanently } =
    useEmailThreadMailboxActions({
      messages: threadMessages,
      mailboxId,
      selfAddress,
      onReadStateChanged,
      reloadThread: loadThread,
      onFinished: () => navigation.goBack(),
    });

  const onBackButtonPressed = () => navigation.goBack();

  const onToggleExpanded = (messageId: string) => {
    setExpandedMessageIds((expanded) =>
      expanded.includes(messageId) ? expanded.filter((id) => id !== messageId) : [...expanded, messageId],
    );
  };

  const onReply = (message: EmailResponse, replyAll: boolean) => {
    if (isUpdating) return;

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

  const onForward = ({ message, bodySource }: ResolvedMessage) => {
    if (isUpdating || bodySource.type === 'encryptedUnreadable') {
      return;
    }

    const sender = message.from?.[0];

    navigation.navigate('ComposeEmail', {
      forward: {
        forwardedMessageId: message.id,
        subject: forwardedSubject(message.subject),
        quote: buildForwardedQuote(message, bodySource),
        attachments: (message.attachments ?? []).map(({ blobId, name, type, size }) => ({ blobId, name, type, size })),
        areAttachmentsEncrypted: bodySource.type !== 'plain',
        originalSender: sender?.name || sender?.email || '',
      },
    });
  };

  const onPressAttachment = (
    { message, attachmentsSessionKey }: ResolvedMessage,
    attachment: NonNullable<EmailResponse['attachments']>[number],
  ) =>
    openAttachment({
      emailId: message.id,
      blobId: attachment.blobId,
      name: attachment.name,
      type: attachment.type,
      attachmentsSessionKey,
    });

  const onScrollContentSizeChange = () => {
    if (!hasScrolledToEnd.current) {
      hasScrolledToEnd.current = true;
      scrollViewRef.current?.scrollTo({ y: lastMessageOffsetRef.current, animated: false });
    }
  };

  const renderMessage = (entry: ResolvedMessage, index: number) => {
    const { message, bodySource } = entry;
    const isLastMessage = latestEntry === entry;
    const nextMessage = thread[index + 1]?.message;
    const hasSeparator =
      !expandedMessageIds.includes(message.id) && !!nextMessage && !expandedMessageIds.includes(nextMessage.id);

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
          canReplyAll={canReplyAllTo(message)}
          canForward={bodySource.type !== 'encryptedUnreadable'}
          hasFooterBar={isLastMessage}
          onToggleExpanded={() => onToggleExpanded(message.id)}
          onReply={() => onReply(message, false)}
          onReplyAll={() => onReply(message, true)}
          onForward={() => onForward(entry)}
          openingAttachmentId={openingAttachmentId}
          onPressAttachment={(attachment) => onPressAttachment(entry, attachment)}
        />
      </View>
    );
  };

  return (
    <AppScreen safeAreaTop style={[tailwind('flex-1 flex-grow'), { backgroundColor: getColor('bg-gray-5') }]}>
      <AppScreenTitle
        text={latestEntry?.message.subject || strings.screens.mail.title}
        onBackButtonPressed={onBackButtonPressed}
      />
      {!isLoading && !hasError && messagesInMailbox.length > 0 && (
        <ThreadActions
          mailboxId={mailboxId}
          isDisabled={isUpdating}
          onMarkUnread={markUnread}
          onMove={moveThread}
          onRestore={restoreThread}
          onDeletePermanently={confirmAndDeleteThreadPermanently}
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

      {!isLoading && !hasError && latestEntry && (
        <MessageFooterBar
          attachments={latestEntry.message.attachments ?? []}
          openingAttachmentId={openingAttachmentId}
          isBusy={isUpdating}
          canReplyAll={canReplyAllTo(latestEntry.message)}
          canForward={latestEntry.bodySource.type !== 'encryptedUnreadable'}
          onPressAttachment={(attachment) => onPressAttachment(latestEntry, attachment)}
          onReply={() => onReply(latestEntry.message, false)}
          onReplyAll={() => onReply(latestEntry.message, true)}
          onForward={() => onForward(latestEntry)}
        />
      )}
    </AppScreen>
  );
};
