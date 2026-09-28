import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import { EnvelopeIcon, ListIcon, PaperclipIcon, WarningIcon } from 'phosphor-react-native';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, TouchableOpacity, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import AppScreen from '../../../components/AppScreen';
import AppText from '../../../components/AppText';
import useGetColor from '../../../hooks/useColor';
import { useLanguage } from '../../../hooks/useLanguage';
import strings from '../../../../assets/lang/strings';
import { logger } from '@internxt-mobile/services/common';
import { MailboxId } from '../../../types/mail';
import { MailboxScreenProps } from '../../../types/navigation';
import { useAppDispatch } from '../../../store/hooks';
import { loadUnreadCountsThunk } from '../../../store/slices/mail';
import { useMailboxEmails } from '../../../store/slices/mail/hooks/useMailboxEmails';

const MailboxListScreen = ({ route, navigation }: MailboxScreenProps): JSX.Element => {
  const selectedMailboxId = route.name as MailboxId;
  const tailwind = useTailwind();
  const getColor = useGetColor();
  useLanguage();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasLoadedMailboxRef = useRef(false);
  const dispatch = useAppDispatch();
  const {
    emails,
    isLoadingFirstPage,
    isLoadingNextPage,
    hasFirstPageFailed,
    hasNextPageFailed,
    loadFirstPage,
    loadNextPage,
    retryNextPage,
    refreshNewestEmails,
  } = useMailboxEmails(selectedMailboxId);

  const refreshUnreadCounts = useCallback(() => {
    dispatch(loadUnreadCountsThunk());
  }, [dispatch]);

  const loadMailboxOnFocus = useCallback(async () => {
    if (hasLoadedMailboxRef.current) {
      await refreshNewestEmails();
    } else {
      hasLoadedMailboxRef.current = true;
      await loadFirstPage();
    }
    refreshUnreadCounts();
  }, [loadFirstPage, refreshNewestEmails, refreshUnreadCounts]);

  useFocusEffect(
    useCallback(() => {
      const timeout = setTimeout(() => {
        loadMailboxOnFocus().catch((error) => logger.error('Failed to load emails on focus', error));
      }, 0);
      return () => clearTimeout(timeout);
    }, [loadMailboxOnFocus, route.name]),
  );

  const onPullToRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadFirstPage();
      refreshUnreadCounts();
    } finally {
      setIsRefreshing(false);
    }
  };

  const isDraftsMailbox = selectedMailboxId === MailboxId.Drafts;

  const onOpenEmail = (emailId: string) => {
    if (isDraftsMailbox) {
      navigation.navigate('ComposeEmail', { draft: { draftId: emailId } });
      return;
    }
    navigation.navigate('EmailDetail', { emailId });
  };

  const renderHeader = () => (
    <View style={tailwind('flex-row items-center px-4 py-3')}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={strings.screens.mail.openMailboxes}
        onPress={() => navigation.openDrawer()}
        style={tailwind('pr-3 py-1')}
      >
        <ListIcon color={getColor('text-gray-100')} size={24} />
      </TouchableOpacity>
      <AppText medium numberOfLines={1} style={[tailwind('text-2xl'), { color: getColor('text-gray-100') }]}>
        {strings.screens.mail.mailboxes[selectedMailboxId]}
      </AppText>
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

  const renderListFooter = () => {
    if (isLoadingNextPage) {
      return (
        <View style={tailwind('items-center py-4')}>
          <ActivityIndicator color={getColor('text-primary')} />
        </View>
      );
    }
    if (hasNextPageFailed) {
      return (
        <View style={tailwind('items-center py-2')}>
          <TouchableOpacity onPress={() => retryNextPage()} style={tailwind('px-4 py-2')}>
            <AppText medium style={{ color: getColor('text-primary') }}>
              {strings.buttons.tryAgain}
            </AppText>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  const renderEmailListContent = () => {
    if (isLoadingFirstPage && emails.length === 0) {
      return (
        <View style={tailwind('flex-1 items-center justify-center')}>
          <ActivityIndicator color={getColor('text-primary')} />
        </View>
      );
    }

    if (hasFirstPageFailed && emails.length === 0) {
      return (
        <View style={tailwind('flex-1 items-center justify-center')}>
          <WarningIcon color={getColor('text-gray-30')} size={48} />
          <AppText style={[tailwind('mt-3 text-center text-gray-50'), { paddingHorizontal: 32 }]}>
            {strings.errors.generic.title}
          </AppText>
          <TouchableOpacity onPress={onPullToRefresh} style={tailwind('mt-4 px-4 py-2')}>
            <AppText medium style={{ color: getColor('text-primary') }}>
              {strings.buttons.tryAgain}
            </AppText>
          </TouchableOpacity>
        </View>
      );
    }

    if (emails.length === 0) {
      return renderEmptyState();
    }

    return (
      <>
        {hasFirstPageFailed && (
          <View style={[tailwind('flex-row items-center px-4 py-2'), { backgroundColor: getColor('bg-gray-5') }]}>
            <WarningIcon color={getColor('text-gray-50')} size={16} />
            <AppText style={[tailwind('ml-2 flex-1 text-sm'), { color: getColor('text-gray-60') }]}>
              {strings.errors.generic.title}
            </AppText>
          </View>
        )}
        <FlatList
          style={tailwind('flex-1')}
          contentContainerStyle={{ paddingBottom: 32 }}
          data={emails}
          keyExtractor={(email) => email.id}
          onEndReached={() => loadNextPage()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderListFooter}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onPullToRefresh}
              tintColor={getColor('text-gray-50')}
            />
          }
          renderItem={({ item }) => {
            const senderLabel = item.from?.[0]?.name || item.from?.[0]?.email || '';
            const recipientsLabel = (item.to ?? []).map((recipient) => recipient.name || recipient.email).join(', ');
            const headlineLabel = isDraftsMailbox ? recipientsLabel || strings.screens.mail.noRecipients : senderLabel;
            const isShownAsUnread = !item.isRead && !isDraftsMailbox;
            const previewText = item.preview || '(No preview available)';
            return (
              <TouchableOpacity
                onPress={() => onOpenEmail(item.id)}
                style={[
                  tailwind('flex-row px-4 py-3'),
                  { borderBottomWidth: 1, borderBottomColor: getColor('border-gray-5') },
                ]}
              >
                <View style={[tailwind('items-center'), { paddingTop: 6, paddingRight: 8 }]}>
                  {isShownAsUnread && (
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
                        isShownAsUnread ? { fontWeight: '600' } : undefined,
                      ]}
                    >
                      {headlineLabel}
                    </AppText>
                    {item.hasAttachment && (
                      <View accessible accessibilityLabel={strings.screens.mail.hasAttachment} style={tailwind('mr-1')}>
                        <PaperclipIcon size={14} color={getColor('text-gray-40')} />
                      </View>
                    )}
                    <AppText style={[tailwind('text-xs'), { color: getColor('text-gray-40') }]}>
                      {dayjs(item.receivedAt).format('MMM D')}
                    </AppText>
                  </View>
                  <AppText
                    numberOfLines={1}
                    style={[
                      tailwind('mt-0.5 text-sm'),
                      { color: getColor('text-gray-100') },
                      isShownAsUnread ? { fontWeight: '600' } : undefined,
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
      </>
    );
  };

  return (
    <AppScreen safeAreaTop style={tailwind('flex-1 flex-grow')}>
      {renderHeader()}
      <View style={tailwind('flex-1')}>{renderEmailListContent()}</View>
    </AppScreen>
  );
};

export default MailboxListScreen;
