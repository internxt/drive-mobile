import { EmailResponse } from '@internxt/sdk/dist/mail/types';
import { CaretLeftIcon, WarningIcon } from 'phosphor-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import { logger } from '@internxt-mobile/services/common/logger/logger.service';
import strings from '../../../../assets/lang/strings';
import AppScreen from '../../../components/AppScreen';
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
import { REPLY_CAPSULE_BOTTOM, REPLY_CAPSULE_HEIGHT, ReplyCapsule } from './ReplyCapsule';
import { ThreadActions } from './ThreadActions';
import { ThreadGapPill } from './ThreadGapPill';
import { ThreadMessageCard } from './ThreadMessageCard';
import { groupThreadItems, ThreadItem } from './utils/threadItems';

const TOP_BAR_HEIGHT = 48;
const BACK_ICON_SIZE = 24;
const SUBJECT_FONT_SIZE = 24;
const SUBJECT_LINE_HEIGHT = 29;
const CONTENT_SPACE_UNDER_CAPSULE = 24;
const TOP_BAR_LEADING_PADDING = 6;
const TOP_BAR_TRAILING_PADDING = 8;
const TOUCH_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

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
  const [isThreadGapOpen, setIsThreadGapOpen] = useState(false);
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
      setIsThreadGapOpen(false);
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

  const onBackButtonPressed = () => {
    if (!navigation.isFocused()) {
      return;
    }
    navigation.goBack();
  };

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

  const isThread = thread.length > 1;
  const threadItems = groupThreadItems(
    thread.map((entry) => entry.message.id),
    expandedMessageIds,
    isThreadGapOpen,
  );

  const renderMessage = (entry: ResolvedMessage, hasSeparator: boolean) => {
    const { message, bodySource } = entry;
    const isLastMessage = latestEntry === entry;

    return (
      <View
        key={message.id}
        onLayout={isLastMessage ? (event) => (lastMessageOffsetRef.current = event.nativeEvent.layout.y) : undefined}
      >
        <ThreadMessageCard
          message={message}
          bodySource={bodySource}
          selfAddress={selfAddress}
          isExpanded={expandedMessageIds.includes(message.id)}
          hasSeparator={hasSeparator}
          onToggleExpanded={isLastMessage ? undefined : () => onToggleExpanded(message.id)}
          onReply={isThread ? () => onReply(message, false) : undefined}
          openingAttachmentId={openingAttachmentId}
          onPressAttachment={(attachment) => onPressAttachment(entry, attachment)}
        />
      </View>
    );
  };

  const renderThreadItem = (item: ThreadItem, itemIndex: number) => {
    if (item.type === 'gap') {
      return (
        <ThreadGapPill
          key="gap"
          hiddenMessageCount={item.hiddenMessageIds.length}
          onPress={() => setIsThreadGapOpen(true)}
        />
      );
    }
    const entry = thread.find(({ message }) => message.id === item.messageId);
    const nextItem = threadItems[itemIndex + 1];
    return entry ? renderMessage(entry, !!nextItem && nextItem.type === 'message') : null;
  };

  const hasLoadedThread = !isLoading && !hasError && thread.length > 0;

  return (
    <AppScreen safeAreaTop style={tailwind('flex-1 flex-grow')}>
      <View
        style={[
          tailwind('flex-row items-center justify-between'),
          {
            height: TOP_BAR_HEIGHT,
            paddingLeft: TOP_BAR_LEADING_PADDING,
            paddingRight: TOP_BAR_TRAILING_PADDING,
          },
        ]}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={strings.buttons.back}
          onPress={onBackButtonPressed}
          hitSlop={TOUCH_SLOP}
          style={[tailwind('flex-row items-center flex-shrink'), { paddingRight: TOP_BAR_TRAILING_PADDING }]}
        >
          <CaretLeftIcon size={BACK_ICON_SIZE} weight="bold" color={getColor('text-primary')} />
          <AppText numberOfLines={1} style={[tailwind('text-lg'), { color: getColor('text-primary') }]}>
            {strings.screens.mail.mailboxes[mailboxId]}
          </AppText>
        </TouchableOpacity>
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
      </View>

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
          <TouchableOpacity accessibilityRole="button" onPress={loadThread} style={tailwind('mt-4 px-4 py-2')}>
            <AppText medium style={{ color: getColor('text-primary') }}>
              {strings.buttons.tryAgain}
            </AppText>
          </TouchableOpacity>
        </View>
      )}

      {hasLoadedThread && (
        <ScrollView
          ref={scrollViewRef}
          style={tailwind('flex-1')}
          contentContainerStyle={{
            paddingBottom: REPLY_CAPSULE_BOTTOM + REPLY_CAPSULE_HEIGHT + CONTENT_SPACE_UNDER_CAPSULE,
          }}
          onContentSizeChange={onScrollContentSizeChange}
        >
          <AppText
            semibold
            style={[
              tailwind('px-4 pt-1 pb-2'),
              { fontSize: SUBJECT_FONT_SIZE, lineHeight: SUBJECT_LINE_HEIGHT, color: getColor('text-gray-100') },
            ]}
          >
            {latestEntry?.message.subject || strings.screens.mail.title}
          </AppText>
          {isThread && (
            <AppText style={[tailwind('px-4 pb-2 text-sm'), { color: getColor('text-gray-50') }]}>
              {strings.formatString(strings.screens.email_detail.messageCount, thread.length)}
            </AppText>
          )}
          {threadItems.map(renderThreadItem)}
        </ScrollView>
      )}

      {hasLoadedThread && latestEntry && (
        <ReplyCapsule
          isBusy={isUpdating}
          canReplyAll={canReplyAllTo(latestEntry.message)}
          canForward={latestEntry.bodySource.type !== 'encryptedUnreadable'}
          onReply={() => onReply(latestEntry.message, false)}
          onReplyAll={() => onReply(latestEntry.message, true)}
          onForward={() => onForward(latestEntry)}
        />
      )}
    </AppScreen>
  );
};
