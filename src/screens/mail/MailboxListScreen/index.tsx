import { EmailSummaryResponse, MailboxResponse } from '@internxt/sdk/dist/mail/types';
import { useNavigation } from '@react-navigation/native';
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
  useLanguage();
  const [selectedMailboxId, setSelectedMailboxId] = useState<MailboxId>(MailboxId.Inbox);
  const [inboxEmails, setInboxEmails] = useState<EmailSummaryResponse[]>([]);
  const [isLoadingInbox, setIsLoadingInbox] = useState(false);
  const [inboxError, setInboxError] = useState(false);
  const [mailboxesMeta, setMailboxesMeta] = useState<MailboxResponse[]>([]);
  const unreadByMailbox = useMemo(
    () =>
      Object.fromEntries(mailboxesMeta.map((mailbox) => [mailbox.type, mailbox.unreadEmails])) as Record<
        Exclude<MailboxResponse['type'], null>,
        number | undefined
      >,
    [mailboxesMeta],
  );
  const inboxUnreadCount = unreadByMailbox.inbox ?? 0;

  const mailboxes = [
    { id: MailboxId.Inbox, label: strings.screens.mail.mailboxes.inbox, Icon: TrayIcon },
    { id: MailboxId.Sent, label: strings.screens.mail.mailboxes.sent, Icon: PaperPlaneTiltIcon },
    { id: MailboxId.Drafts, label: strings.screens.mail.mailboxes.drafts, Icon: NotePencilIcon },
    { id: MailboxId.Spam, label: strings.screens.mail.mailboxes.spam, Icon: WarningIcon },
    { id: MailboxId.Trash, label: strings.screens.mail.mailboxes.trash, Icon: TrashIcon },
  ];

  const loadInboxEmails = useCallback(async () => {
    setIsLoadingInbox(true);
    setInboxError(false);
    const [emailsResult, mailboxesResult] = await Promise.allSettled([
      mailboxService.listEmails('inbox'),
      mailboxService.getMailboxes(),
    ]);

    if (emailsResult.status === 'fulfilled') {
      setInboxEmails(emailsResult.value);
    } else {
      setInboxError(true);
    }

    if (mailboxesResult.status === 'fulfilled') {
      setMailboxesMeta(mailboxesResult.value);
    } else {
      // eslint-disable-next-line no-console
      console.warn('Failed to load mailbox metadata (unread counts)', mailboxesResult.reason);
    }

    setIsLoadingInbox(false);
  }, []);

  useEffect(() => {
    if (selectedMailboxId === MailboxId.Inbox) {
      loadInboxEmails();
    }
  }, [selectedMailboxId, loadInboxEmails]);

  const onOpenEmail = (emailId: string) => {
    navigation.navigate('EmailDetail', { emailId });
  };

  const renderMailboxSwitcher = () => (
    <View style={tailwind('px-4')}>
      {mailboxes.map((mailbox) => {
        const isSelected = mailbox.id === selectedMailboxId;
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
            {mailbox.id === MailboxId.Inbox && inboxUnreadCount > 0 && (
              <View
                style={[
                  tailwind('ml-2 items-center justify-center rounded-full px-2'),
                  { backgroundColor: getColor('text-primary'), minWidth: 22, height: 22 },
                ]}
              >
                <AppText style={[tailwind('text-xs'), { color: getColor('text-white') }]}>{inboxUnreadCount}</AppText>
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

  const renderInboxContent = () => {
    if (isLoadingInbox && inboxEmails.length === 0) {
      return (
        <View style={tailwind('flex-1 items-center justify-center')}>
          <ActivityIndicator color={getColor('text-primary')} />
        </View>
      );
    }

    if (inboxError) {
      return (
        <View style={tailwind('flex-1 items-center justify-center')}>
          <WarningIcon color={getColor('text-gray-30')} size={48} />
          <AppText style={[tailwind('mt-3 text-center text-gray-50'), { paddingHorizontal: 32 }]}>
            {strings.errors.generic.title}
          </AppText>
        </View>
      );
    }

    if (inboxEmails.length === 0) {
      return renderEmptyState();
    }

    return (
      <FlatList
        style={tailwind('flex-1')}
        contentContainerStyle={{ paddingBottom: 32 }}
        data={inboxEmails}
        keyExtractor={(email) => email.id}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingInbox}
            onRefresh={loadInboxEmails}
            tintColor={getColor('text-gray-50')}
          />
        }
        renderItem={({ item }) => {
          const senderLabel = item.from?.[0]?.name || item.from?.[0]?.email || '';
          const previewText = item.preview || '[encrypted preview]';
          return (
            <TouchableOpacity
              onPress={() => onOpenEmail(item.id)}
              style={[
                tailwind('flex-row px-4 py-3'),
                { borderBottomWidth: 1, borderBottomColor: getColor('border-gray-5') },
              ]}
            >
              <View style={tailwind('items-center pt-1.5 pr-2')}>
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
        {selectedMailboxId === MailboxId.Inbox ? renderInboxContent() : renderEmptyState()}
      </View>
    </AppScreen>
  );
};

export default MailboxListScreen;
