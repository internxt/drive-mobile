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
import { SELECTION_TRANSITION_DURATION } from './mailListLayout';
import { SENDER_AVATAR_SIZE, SenderAvatar } from './SenderAvatar';

const AVATAR_GAP = 12;
const UNREAD_DOT_SIZE = 8;
const ROW_HIGHLIGHT_DURATION = 120;

export const EmailSummaryRow = ({
  email,
  isDraftsMailbox,
  isSelected,
  selectionBox,
  mailboxLabel,
  onPress,
  onLongPress,
}: {
  email: EmailSummaryResponse;
  isDraftsMailbox: boolean;
  isSelected: boolean;
  selectionBox?: ReactNode;
  mailboxLabel?: string;
  onPress: () => void;
  onLongPress?: () => void;
}): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  const sender = email.from?.[0];
  const senderLabel = sender?.name || sender?.email || '';
  const avatarContact = isDraftsMailbox ? email.to?.[0] : sender;
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
          tailwind('items-center justify-center'),
          { width: SENDER_AVATAR_SIZE, height: SENDER_AVATAR_SIZE, marginRight: AVATAR_GAP },
        ]}
      >
        {selectionBox ?? (
          <Animated.View
            entering={FadeIn.duration(SELECTION_TRANSITION_DURATION)}
            exiting={FadeOut.duration(SELECTION_TRANSITION_DURATION)}
          >
            <SenderAvatar name={avatarContact?.name} address={avatarContact?.email ?? ''} />
          </Animated.View>
        )}
      </View>
      <View style={tailwind('flex-1')}>
        <View style={tailwind('flex-row items-center justify-between')}>
          <AppText
            numberOfLines={1}
            semibold={isShownAsUnread}
            style={[tailwind('flex-1 mr-2 text-base'), { color: getColor('text-gray-100') }]}
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
          {isShownAsUnread && (
            <View
              accessible
              accessibilityLabel={strings.screens.mail.unread}
              style={[
                tailwind('ml-1.5 rounded-full'),
                { width: UNREAD_DOT_SIZE, height: UNREAD_DOT_SIZE, backgroundColor: getColor('text-primary') },
              ]}
            />
          )}
        </View>
        <View style={tailwind('mt-0.5 flex-row items-center')}>
          <AppText
            numberOfLines={1}
            semibold={isShownAsUnread}
            style={[tailwind('flex-1 text-sm'), { color: getColor('text-gray-100') }]}
          >
            {email.subject}
          </AppText>
          {mailboxLabel ? (
            <AppText style={[tailwind('ml-2 text-xs'), { color: getColor('text-gray-40') }]}>{mailboxLabel}</AppText>
          ) : null}
        </View>
        <AppText numberOfLines={1} style={[tailwind('mt-0.5 text-sm'), { color: getColor('text-gray-40') }]}>
          {previewText}
        </AppText>
      </View>
    </TouchableOpacity>
  );
};
