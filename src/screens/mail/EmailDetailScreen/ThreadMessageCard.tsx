import { EmailResponse } from '@internxt/sdk/dist/mail/types';
import dayjs from 'dayjs';
import { ArrowBendDoubleUpLeftIcon, ArrowBendUpLeftIcon } from 'phosphor-react-native';
import { TouchableOpacity, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import strings from '../../../../assets/lang/strings';
import AppText from '../../../components/AppText';
import useGetColor from '../../../hooks/useColor';
import { type EmailBodySource } from '../../../services/mail/emailBody/emailBodyContent';
import { EmailBody } from './EmailBody';
import { MessageAvatar } from './MessageAvatar';

const COLLAPSED_AVATAR_SIZE = 32;
const EXPANDED_AVATAR_SIZE = 40;

const formatAddresses = (recipients: EmailResponse['to'] | undefined): string =>
  (recipients ?? []).map((recipient) => recipient.email).join(', ');

const MessageAction = ({
  label,
  icon: ActionIcon,
  onPress,
  isDisabled,
}: {
  label: string;
  icon: typeof ArrowBendUpLeftIcon;
  onPress: () => void;
  isDisabled: boolean;
}) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[
        tailwind('flex-1 flex-row items-center justify-center rounded-full py-3'),
        { backgroundColor: getColor('bg-gray-5') },
      ]}
    >
      <ActionIcon color={getColor('text-gray-80')} size={18} />
      <AppText numberOfLines={1} style={[tailwind('ml-2 text-sm'), { color: getColor('text-gray-80') }]}>
        {label}
      </AppText>
    </TouchableOpacity>
  );
};

export const ThreadMessageCard = ({
  message,
  bodySource,
  isExpanded,
  isBusy,
  hasSeparator,
  onToggleExpanded,
  onReply,
  onReplyAll,
  onPressAttachment,
}: {
  message: EmailResponse;
  bodySource: EmailBodySource;
  isExpanded: boolean;
  isBusy: boolean;
  hasSeparator: boolean;
  onToggleExpanded: () => void;
  onReply: () => void;
  onReplyAll: () => void;
  onPressAttachment: (attachment: NonNullable<EmailResponse['attachments']>[number]) => void;
}) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const { actions, to: toLabel, cc: ccLabel } = strings.screens.email_detail;

  const sender = message.from?.[0];
  const senderName = sender?.name;
  const senderAddress = sender?.email ?? '';
  const recipientsLabel = formatAddresses(message.to);
  const copyLabel = formatAddresses(message.cc);

  return (
    <View
      style={
        isExpanded
          ? [tailwind('mx-4 my-2 rounded-xl overflow-hidden'), { backgroundColor: getColor('bg-surface') }]
          : { borderBottomWidth: hasSeparator ? 1 : 0, borderBottomColor: getColor('border-gray-10') }
      }
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onToggleExpanded}
        style={tailwind(isExpanded ? 'flex-row px-4 py-4' : 'flex-row px-4 py-3')}
      >
        <MessageAvatar
          name={senderName}
          address={senderAddress}
          size={isExpanded ? EXPANDED_AVATAR_SIZE : COLLAPSED_AVATAR_SIZE}
        />

        <View style={tailwind(isExpanded ? 'flex-1 ml-3' : 'flex-1 ml-2 justify-center')}>
          <AppText
            medium={isExpanded}
            numberOfLines={1}
            style={[
              tailwind(isExpanded ? 'text-base' : 'text-sm'),
              { color: getColor(isExpanded ? 'text-gray-100' : 'text-gray-60') },
            ]}
          >
            {senderName || senderAddress}
          </AppText>

          {isExpanded && !!senderName && (
            <AppText numberOfLines={1} style={[tailwind('text-sm'), { color: getColor('text-gray-40') }]}>
              {senderAddress}
            </AppText>
          )}

          {!!recipientsLabel && (
            <AppText
              numberOfLines={1}
              style={[tailwind(isExpanded ? 'text-sm' : 'text-xs'), { color: getColor('text-gray-40') }]}
            >
              {toLabel} {recipientsLabel}
            </AppText>
          )}

          {isExpanded && !!copyLabel && (
            <AppText numberOfLines={1} style={[tailwind('text-sm'), { color: getColor('text-gray-40') }]}>
              {ccLabel} {copyLabel}
            </AppText>
          )}
        </View>

        <AppText style={[tailwind('ml-2 text-xs'), { color: getColor('text-gray-40') }]}>
          {dayjs(message.receivedAt).format('MMM D · h:mm A')}
        </AppText>
      </TouchableOpacity>

      {isExpanded && (
        <View style={tailwind('px-4 pb-4')}>
          <EmailBody message={message} bodySource={bodySource} />

          {message.attachments && message.attachments.length > 0 && (
            <View style={tailwind('mt-3')}>
              {message.attachments.map((attachment) => (
                <TouchableOpacity
                  key={attachment.blobId}
                  style={[
                    tailwind('flex-row items-center py-3'),
                    { borderTopWidth: 1, borderTopColor: getColor('border-gray-5') },
                  ]}
                  onPress={() => onPressAttachment(attachment)}
                >
                  <AppText numberOfLines={1} style={[tailwind('flex-1'), { color: getColor('text-primary') }]}>
                    {attachment.name}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={tailwind('flex-row mt-4')}>
            <MessageAction label={actions.reply} icon={ArrowBendUpLeftIcon} isDisabled={isBusy} onPress={onReply} />
            <View style={tailwind('w-3')} />
            <MessageAction
              label={actions.replyAll}
              icon={ArrowBendDoubleUpLeftIcon}
              isDisabled={isBusy}
              onPress={onReplyAll}
            />
          </View>
        </View>
      )}
    </View>
  );
};
