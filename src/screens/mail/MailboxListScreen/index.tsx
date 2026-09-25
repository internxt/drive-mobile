import { EmailSummaryResponse } from '@internxt/sdk/dist/mail/types';
import { useFocusEffect } from '@react-navigation/native';
import {
  CheckIcon,
  CheckSquareIcon,
  EnvelopeIcon,
  ListIcon,
  MagnifyingGlassIcon,
  SquareIcon,
  WarningIcon,
  XIcon,
} from 'phosphor-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut, LayoutAnimationConfig, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { useTailwind } from 'tailwind-rn';

import { logger } from '@internxt-mobile/services/common';
import strings from '../../../../assets/lang/strings';
import AppScreen from '../../../components/AppScreen';
import AppText from '../../../components/AppText';
import { FLOATING_BUTTON_CLEARANCE } from '../../../components/FloatingActionButton/floatingButtonLayout';
import useGetColor from '../../../hooks/useColor';
import { useLanguage } from '../../../hooks/useLanguage';
import { useAppDispatch } from '../../../store/hooks';
import { loadUnreadCountsThunk } from '../../../store/slices/mail';
import { useMailboxEmails } from '../../../store/slices/mail/hooks/useMailboxEmails';
import { uiActions } from '../../../store/slices/ui';
import { MailboxId } from '../../../types/mail';
import { MailboxScreenProps } from '../../../types/navigation';
import { EmailSummaryRow } from '../components/EmailSummaryRow';
import { HEADER_ICON_GAP, HEADER_ICON_SIZE, SELECTION_TRANSITION_DURATION } from '../components/mailListLayout';
import { MailListSkeleton } from '../components/MailListSkeleton';
import { RefreshLine } from '../components/RefreshLine';
import { useMailboxBulkActions } from './hooks/useMailboxBulkActions';
import { useMailboxSelection } from './hooks/useMailboxSelection';
import { MailboxSelectionBar } from './MailboxSelectionBar';

const CLOSE_BUTTON_SIZE = 32;
const SELECTION_BOX_SIZE = 20;
const CLOSE_ICON_SIZE = 18;
const SELECT_ALL_ICON_SIZE = 16;
const SELECT_ALL_BORDER_WIDTH = 1;
const SELECTION_BOX_BORDER_WIDTH = 1.5;
const CHECK_ICON_SIZE = 14;
const LIST_BOTTOM_PADDING_UNDER_SELECTION_BAR = 96;
const COMPOSE_BUTTON_COLLAPSE_OFFSET = 20;
const SCROLL_EVENT_THROTTLE_MS = 16;

const MailboxListScreen = ({ route, navigation }: MailboxScreenProps): JSX.Element => {
  const selectedMailboxId = route.name as MailboxId;
  const tailwind = useTailwind();
  const getColor = useGetColor();
  useLanguage();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasLoadedMailboxRef = useRef(false);
  const isScrolledPastCollapseOffsetRef = useRef(false);
  const dispatch = useAppDispatch();
  const {
    emails,
    isLoadingFirstPage,
    isLoadingNextPage,
    isRefreshingNewestEmails,
    hasFirstPageFailed,
    hasNextPageFailed,
    loadFirstPage,
    loadNextPage,
    retryNextPage,
    refreshNewestEmails,
  } = useMailboxEmails(selectedMailboxId);

  const listedEmailIds = useMemo(() => emails.map((email) => email.id), [emails]);
  const { selectedEmailIds, isSelecting, areAllSelected, toggleEmailSelection, selectAll, clearSelection } =
    useMailboxSelection(listedEmailIds);
  const selectedEmails = useMemo(
    () => emails.filter((email) => selectedEmailIds.includes(email.id)),
    [emails, selectedEmailIds],
  );
  const areAllSelectedRead = selectedEmails.every((email) => email.isRead);
  const {
    isUpdating,
    markSelectedRead,
    markSelectedUnread,
    moveSelected,
    restoreSelected,
    confirmAndDeleteSelectedPermanently,
  } = useMailboxBulkActions({ selectedEmails, onFinished: clearSelection });

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
      return () => {
        clearTimeout(timeout);
        clearSelection();
      };
    }, [loadMailboxOnFocus, route.name, clearSelection]),
  );

  useFocusEffect(
    useCallback(() => {
      dispatch(uiActions.setIsComposeButtonCollapsed(isScrolledPastCollapseOffsetRef.current));
    }, [dispatch]),
  );

  useEffect(() => {
    dispatch(uiActions.setIsFloatingButtonHidden(isSelecting));
  }, [isSelecting, dispatch]);

  useEffect(
    () => () => {
      dispatch(uiActions.setIsFloatingButtonHidden(false));
    },
    [dispatch],
  );

  const onListScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const isScrolledPastCollapseOffset = event.nativeEvent.contentOffset.y > COMPOSE_BUTTON_COLLAPSE_OFFSET;
    if (isScrolledPastCollapseOffset !== isScrolledPastCollapseOffsetRef.current) {
      isScrolledPastCollapseOffsetRef.current = isScrolledPastCollapseOffset;
      dispatch(uiActions.setIsComposeButtonCollapsed(isScrolledPastCollapseOffset));
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (!isSelecting) {
        return;
      }
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        clearSelection();
        return true;
      });
      return () => subscription.remove();
    }, [isSelecting, clearSelection]),
  );

  const refreshFromTitle = () => {
    refreshNewestEmails().catch((error) => logger.error('Failed to refresh the mailbox', error));
    refreshUnreadCounts();
  };

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

  const onOpenEmail = (email: EmailSummaryResponse) => {
    if (isSelecting) {
      toggleEmailSelection(email.id);
      return;
    }
    if (isDraftsMailbox) {
      navigation.navigate('ComposeEmail', { draft: { draftId: email.id } });
      return;
    }
    navigation.navigate('EmailDetail', { email, mailboxId: selectedMailboxId });
  };

  const renderSelectionHeader = () => (
    <Animated.View
      entering={FadeIn.duration(SELECTION_TRANSITION_DURATION)}
      exiting={FadeOut.duration(SELECTION_TRANSITION_DURATION)}
      style={[StyleSheet.absoluteFill, tailwind('flex-row items-center px-4')]}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={strings.screens.mail.cancelSelection}
        onPress={clearSelection}
        style={[
          tailwind('items-center justify-center rounded-full'),
          {
            width: CLOSE_BUTTON_SIZE,
            height: CLOSE_BUTTON_SIZE,
            marginLeft: (HEADER_ICON_SIZE - CLOSE_BUTTON_SIZE) / 2,
            marginRight: HEADER_ICON_GAP - (CLOSE_BUTTON_SIZE - HEADER_ICON_SIZE) / 2,
            backgroundColor: getColor('bg-gray-5'),
          },
        ]}
      >
        <XIcon color={getColor('text-gray-100')} size={CLOSE_ICON_SIZE} />
      </TouchableOpacity>
      <AppText medium numberOfLines={1} style={[tailwind('flex-1 text-xl'), { color: getColor('text-gray-100') }]}>
        {strings.formatString(strings.screens.mail.selectedCount, selectedEmailIds.length)}
      </AppText>
      <TouchableOpacity
        accessibilityRole="button"
        onPress={areAllSelected ? clearSelection : selectAll}
        style={[
          tailwind('flex-row items-center rounded-full ml-2 px-3 py-1.5'),
          { borderWidth: SELECT_ALL_BORDER_WIDTH, borderColor: getColor('border-gray-10') },
        ]}
      >
        {areAllSelected ? (
          <CheckSquareIcon color={getColor('text-gray-100')} size={SELECT_ALL_ICON_SIZE} />
        ) : (
          <SquareIcon color={getColor('text-gray-100')} size={SELECT_ALL_ICON_SIZE} />
        )}
        <View style={tailwind('ml-1.5')}>
          <AppText medium style={[tailwind('text-sm'), { color: getColor('text-gray-100') }]}>
            {areAllSelected ? strings.screens.mail.deselectAll : strings.screens.mail.selectAll}
          </AppText>
          <AppText
            medium
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[tailwind('text-sm'), styles.widthReferenceLabel]}
          >
            {areAllSelected ? strings.screens.mail.selectAll : strings.screens.mail.deselectAll}
          </AppText>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderHeader = () => (
    <Animated.View
      entering={FadeIn.duration(SELECTION_TRANSITION_DURATION)}
      exiting={FadeOut.duration(SELECTION_TRANSITION_DURATION)}
      style={[StyleSheet.absoluteFill, tailwind('flex-row items-center px-4')]}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={strings.screens.mail.openMailboxes}
        onPress={() => navigation.openDrawer()}
        style={tailwind('pr-3 py-1')}
      >
        <ListIcon color={getColor('text-gray-100')} size={HEADER_ICON_SIZE} />
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityHint={strings.screens.mail.refreshMailbox}
        onPress={refreshFromTitle}
        style={tailwind('flex-1')}
      >
        <AppText medium numberOfLines={1} style={[tailwind('text-2xl'), { color: getColor('text-gray-100') }]}>
          {strings.screens.mail.mailboxes[selectedMailboxId]}
        </AppText>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={strings.screens.mail.search.open}
        onPress={() => navigation.navigate('MailSearch')}
        style={tailwind('pl-3 py-1')}
      >
        <MagnifyingGlassIcon color={getColor('text-gray-100')} size={HEADER_ICON_SIZE} />
      </TouchableOpacity>
    </Animated.View>
  );

  const renderSelectionBox = (isSelected: boolean) => (
    <Animated.View
      entering={FadeIn.duration(SELECTION_TRANSITION_DURATION)}
      exiting={FadeOut.duration(SELECTION_TRANSITION_DURATION)}
      style={[
        tailwind('rounded-md'),
        {
          width: SELECTION_BOX_SIZE,
          height: SELECTION_BOX_SIZE,
          borderWidth: SELECTION_BOX_BORDER_WIDTH,
          borderColor: getColor('text-gray-30'),
        },
      ]}
    >
      {isSelected && (
        <Animated.View
          entering={ZoomIn.duration(SELECTION_TRANSITION_DURATION)}
          exiting={ZoomOut.duration(SELECTION_TRANSITION_DURATION)}
          style={[
            tailwind('absolute items-center justify-center rounded-md'),
            {
              top: -SELECTION_BOX_BORDER_WIDTH,
              left: -SELECTION_BOX_BORDER_WIDTH,
              width: SELECTION_BOX_SIZE,
              height: SELECTION_BOX_SIZE,
              backgroundColor: getColor('text-primary'),
            },
          ]}
        >
          <CheckIcon color={getColor('text-surface')} size={CHECK_ICON_SIZE} weight="bold" />
        </Animated.View>
      )}
    </Animated.View>
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
      return <MailListSkeleton />;
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
          contentContainerStyle={{
            paddingBottom: isSelecting ? LIST_BOTTOM_PADDING_UNDER_SELECTION_BAR : FLOATING_BUTTON_CLEARANCE,
          }}
          data={emails}
          onScroll={onListScroll}
          scrollEventThrottle={SCROLL_EVENT_THROTTLE_MS}
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
            const isSelected = selectedEmailIds.includes(item.id);
            return (
              <EmailSummaryRow
                email={item}
                isDraftsMailbox={isDraftsMailbox}
                isSelected={isSelected}
                selectionBox={isSelecting ? renderSelectionBox(isSelected) : undefined}
                onPress={() => onOpenEmail(item)}
                onLongPress={() => toggleEmailSelection(item.id)}
              />
            );
          }}
        />
      </>
    );
  };

  return (
    <AppScreen safeAreaTop style={tailwind('flex-1 flex-grow')}>
      <View style={tailwind('h-14')}>
        <LayoutAnimationConfig skipEntering>
          {isSelecting ? renderSelectionHeader() : renderHeader()}
        </LayoutAnimationConfig>
      </View>
      <View style={tailwind('flex-1')}>
        {renderEmailListContent()}
        {isRefreshingNewestEmails && emails.length > 0 && <RefreshLine />}
        {isSelecting && (
          <MailboxSelectionBar
            mailboxId={selectedMailboxId}
            isDisabled={isUpdating}
            areAllSelectedRead={areAllSelectedRead}
            onMarkRead={markSelectedRead}
            onMarkUnread={markSelectedUnread}
            onMove={moveSelected}
            onRestore={restoreSelected}
            onDeletePermanently={confirmAndDeleteSelectedPermanently}
          />
        )}
      </View>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  widthReferenceLabel: { height: 0, opacity: 0 },
});

export default MailboxListScreen;
