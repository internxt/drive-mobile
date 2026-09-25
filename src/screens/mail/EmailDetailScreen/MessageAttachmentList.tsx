import { items } from '@internxt/lib';
import { EmailResponse } from '@internxt/sdk/dist/mail/types';
import { DownloadSimpleIcon } from 'phosphor-react-native';
import prettysize from 'prettysize';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import strings from '../../../../assets/lang/strings';
import AppText from '../../../components/AppText';
import { getFileTypeIcon } from '../../../helpers/filetypes';
import useGetColor from '../../../hooks/useColor';

const FILE_ICON_SIZE = 42;
const DOWNLOAD_ICON_SIZE = 20;
const DISABLED_OPACITY = 0.5;
const SECTION_LABEL_LETTER_SPACING = 0.2;
const CARD_PADDING = 10;

export type MessageAttachment = NonNullable<EmailResponse['attachments']>[number];

export const MessageAttachmentList = ({
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
  const { attachmentCount, singleAttachment } = strings.screens.email_detail;
  const sectionLabel =
    attachments.length === 1 ? singleAttachment : (strings.formatString(attachmentCount, attachments.length) as string);

  return (
    <View>
      <AppText
        semibold
        style={[
          tailwind('text-sm'),
          { color: getColor('text-gray-50'), letterSpacing: SECTION_LABEL_LETTER_SPACING, textTransform: 'uppercase' },
        ]}
      >
        {sectionLabel}
      </AppText>
      {attachments.map((attachment) => {
        const FileTypeIcon = getFileTypeIcon(items.getFilenameAndExt(attachment.name).extension);
        const isOpening = openingAttachmentId === attachment.blobId;
        const isDisabled = !!openingAttachmentId;

        return (
          <Pressable
            key={attachment.blobId}
            accessibilityRole="button"
            accessibilityLabel={attachment.name}
            disabled={isDisabled}
            onPress={() => onPressAttachment(attachment)}
            style={({ pressed }) => [
              tailwind('flex-row items-center rounded-2xl mt-2'),
              {
                padding: CARD_PADDING,
                borderWidth: 1,
                borderColor: getColor('border-gray-10'),
                backgroundColor: pressed ? getColor('bg-gray-5') : undefined,
                opacity: isDisabled && !isOpening ? DISABLED_OPACITY : 1,
              },
            ]}
          >
            <FileTypeIcon width={FILE_ICON_SIZE} height={FILE_ICON_SIZE} />
            <View style={tailwind('flex-1 mx-3')}>
              <AppText medium numberOfLines={1} style={[tailwind('text-base'), { color: getColor('text-gray-100') }]}>
                {attachment.name}
              </AppText>
              <AppText style={[tailwind('text-sm'), { color: getColor('text-gray-50') }]}>
                {prettysize(attachment.size)}
              </AppText>
            </View>
            {isOpening ? (
              <ActivityIndicator color={getColor('text-primary')} />
            ) : (
              <DownloadSimpleIcon size={DOWNLOAD_ICON_SIZE} color={getColor('text-gray-50')} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
};
