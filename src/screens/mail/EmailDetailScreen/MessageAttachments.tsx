import { items } from '@internxt/lib';
import { EmailResponse } from '@internxt/sdk/dist/mail/types';
import prettysize from 'prettysize';
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import AppText from '../../../components/AppText';
import { getFileTypeIcon } from '../../../helpers/filetypes';
import useGetColor from '../../../hooks/useColor';

const ATTACHMENT_ICON_SIZE = 28;
const ATTACHMENT_CHIP_MAX_WIDTH = 220;

export type MessageAttachment = NonNullable<EmailResponse['attachments']>[number];

export const MessageAttachments = ({
  attachments,
  openingAttachmentId,
  onPressAttachment,
}: {
  attachments: MessageAttachment[];
  openingAttachmentId: string | null;
  onPressAttachment: (attachment: MessageAttachment) => void;
}) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tailwind('py-1')}>
      {attachments.map((attachment, index) => {
        const FileTypeIcon = getFileTypeIcon(items.getFilenameAndExt(attachment.name).extension);
        const isOpening = openingAttachmentId === attachment.blobId;

        return (
          <TouchableOpacity
            key={attachment.blobId}
            disabled={!!openingAttachmentId}
            onPress={() => onPressAttachment(attachment)}
            style={[
              tailwind('flex-row items-center rounded-lg px-2 py-2'),
              index > 0 && tailwind('ml-2'),
              { maxWidth: ATTACHMENT_CHIP_MAX_WIDTH, backgroundColor: getColor('bg-gray-5') },
            ]}
          >
            <View style={[tailwind('items-center justify-center mr-2'), { width: ATTACHMENT_ICON_SIZE }]}>
              {isOpening ? (
                <ActivityIndicator size="small" color={getColor('text-primary')} />
              ) : (
                <FileTypeIcon width={ATTACHMENT_ICON_SIZE} height={ATTACHMENT_ICON_SIZE} />
              )}
            </View>
            <View style={tailwind('flex-shrink')}>
              <AppText numberOfLines={1} style={[tailwind('text-sm'), { color: getColor('text-gray-100') }]}>
                {attachment.name}
              </AppText>
              <AppText style={[tailwind('text-xs'), { color: getColor('text-gray-40') }]}>
                {prettysize(attachment.size)}
              </AppText>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};
