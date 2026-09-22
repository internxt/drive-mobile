import { View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import useGetColor from '../../../hooks/useColor';
import { MessageActions } from './MessageActions';
import { MessageAttachment, MessageAttachments } from './MessageAttachments';

export const MessageFooterBar = ({
  attachments,
  openingAttachmentId,
  isBusy,
  canReplyAll,
  canForward,
  onPressAttachment,
  onReply,
  onReplyAll,
  onForward,
}: {
  attachments: MessageAttachment[];
  openingAttachmentId: string | null;
  isBusy: boolean;
  canReplyAll: boolean;
  canForward: boolean;
  onPressAttachment: (attachment: MessageAttachment) => void;
  onReply: () => void;
  onReplyAll: () => void;
  onForward: () => void;
}) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  return (
    <View
      style={[
        tailwind('px-4 py-2'),
        { borderTopWidth: 1, borderTopColor: getColor('border-gray-10'), backgroundColor: getColor('bg-surface') },
      ]}
    >
      {attachments.length > 0 && (
        <View style={tailwind('mb-2')}>
          <MessageAttachments
            attachments={attachments}
            openingAttachmentId={openingAttachmentId}
            onPressAttachment={onPressAttachment}
          />
        </View>
      )}
      <MessageActions
        isBusy={isBusy}
        canReplyAll={canReplyAll}
        canForward={canForward}
        onReply={onReply}
        onReplyAll={onReplyAll}
        onForward={onForward}
      />
    </View>
  );
};
