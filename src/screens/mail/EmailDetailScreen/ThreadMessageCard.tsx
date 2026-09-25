import { EmailResponse } from '@internxt/sdk/dist/mail/types';
import { useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import strings from '../../../../assets/lang/strings';
import AppText from '../../../components/AppText';
import useGetColor from '../../../hooks/useColor';
import { plainTextFromHtml, type EmailBodySource } from '../../../services/mail/emailBody/emailBodyContent';
import { SenderAvatar } from '../components/SenderAvatar';
import { EmailBody } from './EmailBody';
import { MessageAttachment, MessageAttachmentList } from './MessageAttachmentList';
import { MessageHeader } from './MessageHeader';
import { formatShortMessageTime } from './utils/messageTime';

const PRESSED_OPACITY = 0.7;

export const ThreadMessageCard = ({
  message,
  bodySource,
  selfAddress,
  isExpanded,
  hasSeparator,
  onToggleExpanded,
  onReply,
  openingAttachmentId,
  onPressAttachment,
}: {
  message: EmailResponse;
  bodySource: EmailBodySource;
  selfAddress: string;
  isExpanded: boolean;
  hasSeparator: boolean;
  onToggleExpanded?: () => void;
  onReply?: () => void;
  openingAttachmentId: string | null;
  onPressAttachment: (attachment: MessageAttachment) => void;
}) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  const sender = message.from?.[0];
  const senderAddress = sender?.email ?? '';
  const attachments = message.attachments ?? [];

  const snippet = useMemo(() => {
    if (isExpanded) {
      return '';
    }
    if (bodySource.type === 'encryptedUnreadable') {
      return strings.screens.mail.unableToDecryptPreview;
    }
    const preview = bodySource.type === 'decrypted' ? plainTextFromHtml(bodySource.text) : message.preview;
    return preview || strings.screens.email_detail.noContent;
  }, [isExpanded, message, bodySource]);

  return (
    <View style={{ borderBottomWidth: hasSeparator ? 1 : 0, borderBottomColor: getColor('border-gray-5') }}>
      {isExpanded ? (
        <View style={tailwind('px-4 py-4')}>
          <TouchableOpacity
            accessible={false}
            activeOpacity={PRESSED_OPACITY}
            onPress={onToggleExpanded}
            disabled={!onToggleExpanded}
          >
            <MessageHeader message={message} selfAddress={selfAddress} onReply={onReply} />
          </TouchableOpacity>

          <View style={tailwind('mt-4')}>
            <EmailBody message={message} bodySource={bodySource} />
          </View>

          {attachments.length > 0 && (
            <View style={tailwind('mt-5')}>
              <MessageAttachmentList
                attachments={attachments}
                openingAttachmentId={openingAttachmentId}
                onPressAttachment={onPressAttachment}
              />
            </View>
          )}
        </View>
      ) : (
        <TouchableOpacity
          activeOpacity={PRESSED_OPACITY}
          onPress={onToggleExpanded}
          disabled={!onToggleExpanded}
          style={tailwind('flex-row items-center px-4 py-3')}
        >
          <SenderAvatar name={sender?.name} address={senderAddress} size="medium" />
          <View style={tailwind('flex-1 ml-3')}>
            <View style={tailwind('flex-row items-center justify-between')}>
              <AppText
                medium
                numberOfLines={1}
                style={[tailwind('flex-1 mr-2 text-base'), { color: getColor('text-gray-100') }]}
              >
                {sender?.name || senderAddress}
              </AppText>
              <AppText style={[tailwind('text-xs'), { color: getColor('text-gray-50') }]}>
                {formatShortMessageTime(message.receivedAt)}
              </AppText>
            </View>
            <AppText numberOfLines={1} style={[tailwind('text-sm'), { color: getColor('text-gray-50') }]}>
              {snippet}
            </AppText>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};
