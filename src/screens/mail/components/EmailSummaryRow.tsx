import { EmailSummaryResponse } from '@internxt/sdk/dist/mail/types';
import dayjs from 'dayjs';
import { PaperclipIcon } from 'phosphor-react-native';
import { ReactNode } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useTailwind } from 'tailwind-rn';

import strings from '../../../../assets/lang/strings';
import AppText from '../../../components/AppText';
import useGetColor from '../../../hooks/useColor';
import { HEADER_ICON_GAP, LEADING_COLUMN_WIDTH, SELECTION_TRANSITION_DURATION } from './mailListLayout';

const UNREAD_DOT_TOP = 6;
const ROW_HIGHLIGHT_DURATION = 120;

export const EmailSummaryRow = ({
  email,
  isDraftsMailbox,
  isSelected,
  selectionBox,
  onPress,
  onLongPress,
}: {
  email: EmailSummaryResponse;
  isDraftsMailbox: boolean;
  isSelected: boolean;
  selectionBox?: ReactNode;
  onPress: () => void;
  onLongPress?: () => void;
}): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  const senderLabel = email.from?.[0]?.name || email.from?.[0]?.email || '';
  const recipientsLabel = (email.to ?? []).map((recipient) => recipient.name || recipient.email).join(', ');
  const headlineLabel = isDraftsMailbox ? recipientsLabel || strings.screens.mail.noRecipients : senderLabel;
  const isShownAsUnread = !email.isRead && !isDraftsMailbox;
  const previewText = email.preview || '(No preview available)';

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      style={[tailwind('flex-row px-4 py-3'), { borderBottomWidth: 1, borderBottomColor: getColor('border-gray-5') }]}
    >
      {isSelected && (
        <Animated.View
          entering={FadeIn.duration(ROW_HIGHLIGHT_DURATION)}
          exiting={FadeOut.duration(ROW_HIGHLIGHT_DURATION)}
          style={[StyleSheet.absoluteFill, tailwind('rounded-xl'), { backgroundColor: getColor('bg-primary-10') }]}
        />
      )}
      <View
        style={[
          tailwind('items-center'),
          { width: LEADING_COLUMN_WIDTH, paddingTop: UNREAD_DOT_TOP, paddingRight: HEADER_ICON_GAP },
        ]}
      >
        {selectionBox}
        {!selectionBox && isShownAsUnread && (
          <Animated.View
            entering={FadeIn.duration(SELECTION_TRANSITION_DURATION)}
            exiting={FadeOut.duration(SELECTION_TRANSITION_DURATION)}
            style={[tailwind('w-2 h-2 rounded-full'), { backgroundColor: getColor('text-primary') }]}
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
          {email.hasAttachment && (
            <View accessible accessibilityLabel={strings.screens.mail.hasAttachment} style={tailwind('mr-1')}>
              <PaperclipIcon size={14} color={getColor('text-gray-40')} />
            </View>
          )}
          <AppText style={[tailwind('text-xs'), { color: getColor('text-gray-40') }]}>
            {dayjs(email.receivedAt).format('MMM D')}
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
          {email.subject}
        </AppText>
        <AppText numberOfLines={1} style={[tailwind('mt-0.5 text-sm'), { color: getColor('text-gray-40') }]}>
          {previewText}
        </AppText>
      </View>
    </TouchableOpacity>
  );
};
