import { EmailSummaryResponse, MailboxResponse } from '@internxt/sdk/dist/mail/types';
import { getPrivateHybridKey, decryptPreviews } from '../../../services/mail/mailCrypto.service';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import {
  EnvelopeIcon,
  NotePencilIcon,
  PaperPlaneTiltIcon,
  TrashIcon,
  TrayIcon,
  WarningIcon,
} from 'phosphor-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, TouchableOpacity, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import AppScreen from '../../../components/AppScreen';
import AppScreenTitle from '../../../components/AppScreenTitle';
import AppText from '../../../components/AppText';
import useGetColor from '../../../hooks/useColor';
import { useLanguage } from '../../../hooks/useLanguage';
import strings from '../../../../assets/lang/strings';
import { mailboxService } from '../../../services/mail/mailbox.service';
import { useAppSelector } from '../../../store/hooks';
import { MailStackParamList } from '../../../types/navigation';

enum MailboxId {
  Inbox = 'inbox',
  Drafts = 'drafts',
  Sent = 'sent',
  Spam = 'spam',
  Trash = 'trash',
}

const MailboxListScreen = (): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const navigation = useNavigation<NativeStackNavigationProp<MailStackParamList, 'MailboxList'>>();
  const { user } = useAppSelector((state) => state.auth);
  useLanguage();
  const [selectedMailboxId, setSelectedMailboxId] = useState<MailboxId>(MailboxId.Inbox);
  const [emails, setEmails] = useState<EmailSummaryResponse[]>([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [emailsError, setEmailsError] = useState(false);
  const [mailboxesMeta, setMailboxesMeta] = useState<MailboxResponse[]>([]);
  const unreadByMailbox = useMemo(
    () =>
      Object.fromEntries(mailboxesMeta.map((mailbox) => [mailbox.type, mailbox.unreadEmails])) as Record<
        Exclude<MailboxResponse['type'], null>,
        number | undefined
      >,
    [mailboxesMeta],
  );
  const MAILBOXES_WITH_UNREAD_BADGE: MailboxId[] = [MailboxId.Inbox, MailboxId.Spam, MailboxId.Trash];

  function groupEmailsByThread(list: EmailSummaryResponse[]): EmailSummaryResponse[] {
    const byThread = new Map<string, EmailSummaryResponse[]>();
    for (const email of list) {
      const key = email.threadId || email.id;
      const group = byThread.get(key);
      if (group) {
        group.push(email);
      } else {
        byThread.set(key, [email]);
      }
    }

    return Array.from(byThread.values())
      .map((group) => {
        const latest = group.reduce((a, b) => (new Date(a.receivedAt) > new Date(b.receivedAt) ? a : b));
        const hasUnread = group.some((e) => !e.isRead);
        return { ...latest, isRead: !hasUnread };
      })
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
  }

  const mailboxes = [
    { id: MailboxId.Inbox, label: strings.screens.mail.mailboxes.inbox, Icon: TrayIcon },
    { id: MailboxId.Sent, label: strings.screens.mail.mailboxes.sent, Icon: PaperPlaneTiltIcon },
    { id: MailboxId.Drafts, label: strings.screens.mail.mailboxes.drafts, Icon: NotePencilIcon },
    { id: MailboxId.Spam, label: strings.screens.mail.mailboxes.spam, Icon: WarningIcon },
    { id: MailboxId.Trash, label: strings.screens.mail.mailboxes.trash, Icon: TrashIcon },
  ];

  const loadEmails = useCallback(async () => {
    if (selectedMailboxId === MailboxId.Drafts) {
      return;
    }
    setIsLoadingEmails(true);
    setEmails([]);
    setEmailsError(false);
    const [emailsResult, mailboxesResult] = await Promise.allSettled([
      mailboxService.listEmails(selectedMailboxId),
      mailboxService.getMailboxes(),
    ]);

    if (emailsResult.status === 'fulfilled') {
      let emails = emailsResult.value;
      if (user?.mnemonic && user?.email) {
        try {
          const privateKey = await getPrivateHybridKey(user.mnemonic);
          emails = await decryptPreviews(emails, privateKey);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn(`Failed to decrypt previews for ${selectedMailboxId}`, error);
        }
      }
      setEmails(groupEmailsByThread(emails));
    } else {
      setEmailsError(true);
    }

    if (mailboxesResult.status === 'fulfilled') {
      setMailboxesMeta(mailboxesResult.value);
    } else {
      // eslint-disable-next-line no-console
      console.warn('Failed to load mailbox metadata (unread counts)', mailboxesResult.reason);
    }

    setIsLoadingEmails(false);
  }, [user, selectedMailboxId]);

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  useFocusEffect(
    useCallback(() => {
      loadEmails();
    }, [loadEmails]),
  );
  const onOpenEmail = (emailId: string) => {
    navigation.navigate('EmailDetail', { emailId });
  };

  const renderMailboxSwitcher = () => (
    <View style={tailwind('px-4')}>
      {mailboxes.map((mailbox) => {
        const isSelected = mailbox.id === selectedMailboxId;
        const unreadCount = unreadByMailbox[mailbox.id] ?? 0;
        const showUnreadBadge = MAILBOXES_WITH_UNREAD_BADGE.includes(mailbox.id) && unreadCount > 0;

        return (
          <TouchableOpacity
            key={mailbox.id}
            style={[
              tailwind('flex-row items-center py-3.5'),
              { borderBottomWidth: 1, borderBottomColor: getColor('border-gray-5') },
            ]}
            onPress={() => setSelectedMailboxId(mailbox.id)}
          >
            <mailbox.Icon
              color={isSelected ? getColor('text-primary') : getColor('text-gray-80')}
              weight={isSelected ? 'fill' : undefined}
              size={22}
            />
            <AppText style={[tailwind('ml-3 text-lg'), isSelected ? { color: getColor('text-primary') } : undefined]}>
              {mailbox.label}
            </AppText>
            {showUnreadBadge && (
              <View
                style={[
                  tailwind('ml-2 items-center justify-center rounded-full px-2'),
                  { backgroundColor: getColor('text-primary'), minWidth: 22, height: 22 },
                ]}
              >
                <AppText style={[tailwind('text-xs'), { color: getColor('text-white') }]}>{unreadCount}</AppText>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderEmptyState = () => (
    <View style={tailwind('flex-1 items-center justify-center')}>
      <EnvelopeIcon color={getColor('text-gray-30')} size={48} />
      <AppText style={[tailwind('mt-3 text-center text-gray-50'), { paddingHorizontal: 32 }]}>
        {strings.screens.mail.empty[selectedMailboxId]}
      </AppText>
    </View>
  );

  const renderEmailListContent = () => {
    if (isLoadingEmails && emails.length === 0) {
      return (
        <View style={tailwind('flex-1 items-center justify-center')}>
          <ActivityIndicator color={getColor('text-primary')} />
        </View>
      );
    }

    if (emailsError) {
      return (
        <View style={tailwind('flex-1 items-center justify-center')}>
          <WarningIcon color={getColor('text-gray-30')} size={48} />
          <AppText style={[tailwind('mt-3 text-center text-gray-50'), { paddingHorizontal: 32 }]}>
            {strings.errors.generic.title}
          </AppText>
        </View>
      );
    }

    if (emails.length === 0) {
      return renderEmptyState();
    }

    return (
      <FlatList
        style={tailwind('flex-1')}
        contentContainerStyle={{ paddingBottom: 32 }}
        data={emails}
        keyExtractor={(email) => email.id}
        refreshControl={
          <RefreshControl refreshing={isLoadingEmails} onRefresh={loadEmails} tintColor={getColor('text-gray-50')} />
        }
        renderItem={({ item }) => {
          const senderLabel = item.from?.[0]?.name || item.from?.[0]?.email || '';
          const previewText = item.preview || '(No preview available)';
          return (
            <TouchableOpacity
              onPress={() => onOpenEmail(item.id)}
              style={[
                tailwind('flex-row px-4 py-3'),
                { borderBottomWidth: 1, borderBottomColor: getColor('border-gray-5') },
              ]}
            >
              <View style={(tailwind('items-center'), { paddingTop: 6, paddingRight: 8 })}>
                {!item.isRead && (
                  <View
                    style={[
                      tailwind('rounded-full'),
                      { width: 8, height: 8, backgroundColor: getColor('text-primary') },
                    ]}
                  />
                )}
              </View>
              <View style={tailwind('flex-1')}>
                <View style={tailwind('flex-row items-center justify-between')}>
                  <AppText
                    numberOfLines={1}
                    style={[
                      tailwind('flex-1 mr-2 text-base'),
                      { color: getColor('text-gray-100') },
                      !item.isRead ? { fontWeight: '600' } : undefined,
                    ]}
                  >
                    {senderLabel}
                  </AppText>
                  <AppText style={[tailwind('text-xs'), { color: getColor('text-gray-40') }]}>
                    {dayjs(item.receivedAt).format('MMM D')}
                  </AppText>
                </View>
                <AppText
                  numberOfLines={1}
                  style={[
                    tailwind('mt-0.5 text-sm'),
                    { color: getColor('text-gray-100') },
                    !item.isRead ? { fontWeight: '600' } : undefined,
                  ]}
                >
                  {item.subject}
                </AppText>
                <AppText numberOfLines={1} style={[tailwind('mt-0.5 text-sm'), { color: getColor('text-gray-40') }]}>
                  {previewText}
                </AppText>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    );
  };

  return (
    <AppScreen safeAreaTop style={tailwind('flex-1 flex-grow')}>
      <AppScreenTitle text={strings.screens.mail.title} showBackButton={false} />
      <View style={tailwind('flex-1')}>
        {renderMailboxSwitcher()}
        {selectedMailboxId === MailboxId.Drafts ? renderEmptyState() : renderEmailListContent()}
      </View>
    </AppScreen>
  );
};

export default MailboxListScreen;
