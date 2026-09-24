import { EmailSummaryResponse } from '@internxt/sdk/dist/mail/types';
import { useFocusEffect } from '@react-navigation/native';
import { CaretLeftIcon, MagnifyingGlassIcon, WarningIcon } from 'phosphor-react-native';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { useTailwind } from 'tailwind-rn';

import { resolveResultMailbox } from '@internxt-mobile/services/mail/threadMailboxes';
import strings from '../../../../assets/lang/strings';
import AppScreen from '../../../components/AppScreen';
import AppText from '../../../components/AppText';
import { SearchInput } from '../../../components/SearchInput';
import useGetColor from '../../../hooks/useColor';
import { useLanguage } from '../../../hooks/useLanguage';
import { useAppSelector } from '../../../store/hooks';
import { selectMailboxTypeById } from '../../../store/slices/mail';
import { MailboxId } from '../../../types/mail';
import { MailScreenProps } from '../../../types/navigation';
import { EmailSummaryRow } from '../components/EmailSummaryRow';
import { HEADER_ICON_SIZE } from '../components/mailListLayout';
import { EmailFilterPanel } from './components/EmailFilterPanel';
import { SearchFilterBar } from './components/SearchFilterBar';
import { useMailSearch } from './hooks/useMailSearch';
import { useSearchFilters } from './hooks/useSearchFilters';

const STATE_ICON_SIZE = 48;
const STATE_TEXT_HORIZONTAL_PADDING = 32;
const EMAIL_PANEL_TRANSITION_DURATION = 200;
const BACK_BUTTON_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

export const MailSearchScreen = ({ navigation }: MailScreenProps<'MailSearch'>): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  useLanguage();
  const mailboxTypeById = useAppSelector(selectMailboxTypeById);
  const [text, setText] = useState('');
  const hasBeenFocusedRef = useRef(false);
  const { phase, emails, isLoadingNextPage, hasNextPageFailed, search, retry, refresh, loadNextPage, retryNextPage } =
    useMailSearch();
  const {
    searchCriteria,
    emailsToSearch,
    submitText,
    clearText,
    toggleFilter,
    openEmailSearchInput,
    closeEmailSearchInput,
    clearEmailSearchInput,
    changeEmailSearchInput,
  } = useSearchFilters(search);

  useFocusEffect(
    useCallback(() => {
      if (hasBeenFocusedRef.current) {
        refresh();
      }
      hasBeenFocusedRef.current = true;
    }, [refresh]),
  );

  const onChangeText = (changedText: string) => {
    setText(changedText);
    if (!changedText) {
      clearText();
    }
  };

  const onOpenResult = (email: EmailSummaryResponse, mailboxId: MailboxId) => {
    if (mailboxId === MailboxId.Drafts) {
      navigation.navigate('ComposeEmail', { draft: { draftId: email.id } });
      return;
    }
    navigation.navigate('EmailDetail', { emailId: email.id, mailboxId });
  };

  const renderStateMessage = (icon: JSX.Element, message: string, action?: JSX.Element) => (
    <View style={tailwind('flex-1 items-center justify-center')}>
      {icon}
      <AppText
        style={[tailwind('mt-3 text-center text-gray-50'), { paddingHorizontal: STATE_TEXT_HORIZONTAL_PADDING }]}
      >
        {message}
      </AppText>
      {action}
    </View>
  );

  const renderTryAgainButton = (onPress: () => void) => (
    <TouchableOpacity onPress={onPress} style={tailwind('mt-4 px-4 py-2')}>
      <AppText medium style={{ color: getColor('text-primary') }}>
        {strings.buttons.tryAgain}
      </AppText>
    </TouchableOpacity>
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
      return <View style={tailwind('items-center py-2')}>{renderTryAgainButton(retryNextPage)}</View>;
    }
    return null;
  };

  const renderResult = () => {
    if (phase === 'idle') {
      return renderStateMessage(
        <MagnifyingGlassIcon color={getColor('text-gray-30')} size={STATE_ICON_SIZE} />,
        strings.screens.mail.search.idle,
      );
    }
    if (phase === 'loading') {
      return (
        <View style={tailwind('flex-1 items-center justify-center')}>
          <ActivityIndicator color={getColor('text-primary')} />
        </View>
      );
    }
    if (phase === 'failed') {
      return renderStateMessage(
        <WarningIcon color={getColor('text-gray-30')} size={STATE_ICON_SIZE} />,
        strings.errors.generic.title,
        renderTryAgainButton(retry),
      );
    }
    if (emails.length === 0) {
      return renderStateMessage(
        <MagnifyingGlassIcon color={getColor('text-gray-30')} size={STATE_ICON_SIZE} />,
        strings.screens.mail.search.noResults,
      );
    }
    return (
      <FlatList
        style={tailwind('flex-1')}
        contentContainerStyle={tailwind('pb-8')}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        data={emails}
        keyExtractor={(email) => email.id}
        onEndReached={() => loadNextPage()}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderListFooter}
        renderItem={({ item }) => {
          const mailboxId = resolveResultMailbox(item, mailboxTypeById);
          return (
            <EmailSummaryRow
              email={item}
              isDraftsMailbox={item.isDraft}
              isSelected={false}
              mailboxLabel={strings.screens.mail.mailboxes[mailboxId]}
              onPress={() => onOpenResult(item, mailboxId)}
            />
          );
        }}
      />
    );
  };

  return (
    <AppScreen safeAreaTop style={tailwind('flex-1 flex-grow')}>
      <View style={tailwind('flex-row items-center pl-4')}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={strings.buttons.back}
          hitSlop={BACK_BUTTON_HIT_SLOP}
          onPress={() => navigation.goBack()}
        >
          <CaretLeftIcon weight="bold" color={getColor('text-primary')} size={HEADER_ICON_SIZE} />
        </TouchableOpacity>
        <SearchInput
          style={tailwind('flex-1')}
          value={text}
          placeholder={strings.screens.mail.search.placeholder}
          autoFocus
          returnKeyType="search"
          onChangeText={onChangeText}
          onSubmitEditing={() => submitText(text)}
        />
      </View>
      <SearchFilterBar
        searchCriteria={searchCriteria}
        expandedEmailSearchInput={emailsToSearch?.field}
        onOpenEmailSearchInput={openEmailSearchInput}
        onClearEmailSearchInput={clearEmailSearchInput}
        onToggleFilter={toggleFilter}
      />
      {emailsToSearch && (
        <Animated.View
          entering={FadeInUp.duration(EMAIL_PANEL_TRANSITION_DURATION)}
          exiting={FadeOutUp.duration(EMAIL_PANEL_TRANSITION_DURATION)}
        >
          <EmailFilterPanel
            label={strings.screens.mail.search.filters[emailsToSearch.field]}
            emails={emailsToSearch.emails}
            pendingText={emailsToSearch.pendingText}
            onChange={changeEmailSearchInput}
            onDone={closeEmailSearchInput}
          />
        </Animated.View>
      )}
      <Animated.View layout={LinearTransition.duration(EMAIL_PANEL_TRANSITION_DURATION)} style={tailwind('flex-1')}>
        {renderResult()}
      </Animated.View>
    </AppScreen>
  );
};
