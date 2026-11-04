import { EmailResponse } from '@internxt/sdk/dist/mail/types';
import { ArrowBendUpLeftIcon, CaretDownIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useTailwind } from 'tailwind-rn';

import strings from '../../../../assets/lang/strings';
import AppText from '../../../components/AppText';
import useGetColor from '../../../hooks/useColor';
import { SenderAvatar } from '../components/SenderAvatar';
import { formatFullMessageTime, formatShortMessageTime } from './utils/messageTime';
import { RecipientSummary, summarizeRecipients } from './utils/recipientSummary';

const CARET_SIZE = 14;
const CARET_OPEN_ROTATION_DEGREES = 180;
const CARET_ROTATION_DURATION = 200;
const DETAIL_LABEL_GAP = 14;
const REPLY_BUTTON_SIZE = 36;
const REPLY_ICON_SIZE = 19;

type EmailAddress = NonNullable<EmailResponse['to']>[number];

const formatAddresses = (recipients: EmailAddress[] | undefined): string =>
  (recipients ?? []).map((recipient) => recipient.email).join(', ');

const describeRecipientSummary = ({
  isSelfIncluded,
  firstRecipientLabel,
  otherRecipientCount,
}: RecipientSummary): string => {
  const { toMe, toMeAndOthers, toRecipient, toRecipientAndOthers } = strings.screens.email_detail;
  if (isSelfIncluded) {
    return otherRecipientCount > 0 ? (strings.formatString(toMeAndOthers, otherRecipientCount) as string) : toMe;
  }
  return otherRecipientCount > 0
    ? (strings.formatString(toRecipientAndOthers, firstRecipientLabel, otherRecipientCount) as string)
    : (strings.formatString(toRecipient, firstRecipientLabel) as string);
};

export const MessageHeader = ({
  message,
  selfAddress,
  onReply,
}: {
  message: EmailResponse;
  selfAddress: string;
  onReply?: () => void;
}) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const [areDetailsShown, setAreDetailsShown] = useState(false);
  const [detailLabelWidth, setDetailLabelWidth] = useState(0);
  const { email_detail: detailStrings } = strings.screens;

  const sender = message.from?.[0];
  const senderAddress = sender?.email ?? '';
  const recipientSummary = summarizeRecipients(message, selfAddress);

  const caretStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: withTiming(`${areDetailsShown ? CARET_OPEN_ROTATION_DEGREES : 0}deg`, {
          duration: CARET_ROTATION_DURATION,
        }),
      },
    ],
  }));

  const detailRows = [
    { label: strings.inputs.from, value: senderAddress },
    { label: strings.inputs.to, value: formatAddresses(message.to) },
    { label: strings.inputs.cc, value: formatAddresses(message.cc) },
    { label: strings.inputs.bcc, value: formatAddresses(message.bcc) },
    { label: detailStrings.date, value: formatFullMessageTime(message.receivedAt) },
  ].filter((detailRow) => !!detailRow.value);

  return (
    <View>
      <View style={tailwind('flex-row items-center')}>
        <SenderAvatar name={sender?.name} address={senderAddress} />
        <View style={tailwind('flex-1 ml-3')}>
          <View style={tailwind('flex-row items-center justify-between')}>
            <AppText
              semibold
              numberOfLines={1}
              style={[tailwind('flex-1 mr-2 text-base'), { color: getColor('text-gray-100') }]}
            >
              {sender?.name || senderAddress}
            </AppText>
            <AppText style={[tailwind('text-xs'), { color: getColor('text-gray-50') }]}>
              {formatShortMessageTime(message.receivedAt)}
            </AppText>
          </View>
          {recipientSummary && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityHint={areDetailsShown ? detailStrings.hideDetails : detailStrings.showDetails}
              accessibilityState={{ expanded: areDetailsShown }}
              onPress={() => setAreDetailsShown(!areDetailsShown)}
              style={[tailwind('flex-row items-center mt-0.5'), { alignSelf: 'flex-start' }]}
            >
              <AppText numberOfLines={1} style={[tailwind('text-sm mr-1'), { color: getColor('text-gray-50') }]}>
                {describeRecipientSummary(recipientSummary)}
              </AppText>
              <Animated.View style={caretStyle}>
                <CaretDownIcon size={CARET_SIZE} weight="bold" color={getColor('text-gray-50')} />
              </Animated.View>
            </TouchableOpacity>
          )}
        </View>
        {onReply && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={detailStrings.actions.reply}
            onPress={onReply}
            style={({ pressed }) => [
              tailwind('items-center justify-center rounded-full ml-2'),
              {
                width: REPLY_BUTTON_SIZE,
                height: REPLY_BUTTON_SIZE,
                backgroundColor: pressed ? getColor('bg-gray-5') : undefined,
              },
            ]}
          >
            <ArrowBendUpLeftIcon size={REPLY_ICON_SIZE} color={getColor('text-gray-50')} />
          </Pressable>
        )}
      </View>

      {areDetailsShown && (
        <View style={[tailwind('mt-3 rounded-xl px-3.5 py-3'), { backgroundColor: getColor('bg-gray-5') }]}>
          {detailRows.map(({ label, value }, rowIndex) => (
            <View key={label} style={[tailwind('flex-row'), rowIndex > 0 && tailwind('mt-1.5')]}>
              <AppText
                onLayout={(event) => {
                  const { width } = event.nativeEvent.layout;
                  setDetailLabelWidth((widestLabelWidth) => Math.max(widestLabelWidth, width));
                }}
                style={[
                  tailwind('text-sm'),
                  { minWidth: detailLabelWidth, marginRight: DETAIL_LABEL_GAP, color: getColor('text-gray-50') },
                ]}
              >
                {label}
              </AppText>
              <AppText style={[tailwind('flex-1 text-sm'), { color: getColor('text-gray-100') }]}>{value}</AppText>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};
