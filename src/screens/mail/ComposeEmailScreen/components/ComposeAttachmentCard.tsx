import { items } from '@internxt/lib';
import { ArrowClockwiseIcon, XIcon } from 'phosphor-react-native';
import prettysize from 'prettysize';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import { formatMaxAttachmentSize } from '@internxt-mobile/services/mail/attachmentLimits';
import strings from '../../../../../assets/lang/strings';
import AppText from '../../../../components/AppText';
import { getFileTypeIcon } from '../../../../helpers/filetypes';
import useGetColor from '../../../../hooks/useColor';
import { ComposeAttachment } from '../hooks/useComposeAttachments';

const FILE_ICON_SIZE = 36;
const NAME_MAX_WIDTH = 120;
const ACTION_BUTTON_SIZE = 24;
const ACTION_ICON_SIZE = 12;
const DISABLED_OPACITY = 0.5;

const readAttachmentSize = (attachment: ComposeAttachment): number | undefined =>
  attachment.status === 'uploaded' ? attachment.uploadedAttachment.size : attachment.file.size;

export const ComposeAttachmentCard = ({
  attachment,
  disabled,
  onRetry,
  onRemove,
}: {
  attachment: ComposeAttachment;
  disabled?: boolean;
  onRetry?: () => void;
  onRemove: () => void;
}): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const { attachments: attachmentStrings } = strings.screens.compose_email;
  const failure = attachment.status === 'failed' ? attachment.failure : undefined;
  const failureMessage =
    failure === 'tooLarge'
      ? (strings.formatString(attachmentStrings.tooLarge, formatMaxAttachmentSize()) as string)
      : attachmentStrings.uploadFailed;
  const canRetry = failure === 'notUploaded' && !!onRetry;
  const size = readAttachmentSize(attachment);
  const FileTypeIcon = getFileTypeIcon(items.getFilenameAndExt(attachment.name).extension);

  const renderActionButton = (label: string, Icon: typeof XIcon, onPress: () => void) => (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${label} ${attachment.name}`}
      disabled={disabled}
      onPress={onPress}
      style={[
        tailwind('items-center justify-center rounded-full ml-1'),
        { width: ACTION_BUTTON_SIZE, height: ACTION_BUTTON_SIZE, opacity: disabled ? DISABLED_OPACITY : 1 },
      ]}
    >
      <Icon size={ACTION_ICON_SIZE} weight="bold" color={getColor('text-gray-50')} />
    </TouchableOpacity>
  );

  return (
    <View
      style={[
        tailwind('flex-row items-center rounded-xl p-2 mr-2'),
        { borderWidth: 1, borderColor: getColor('border-gray-10'), backgroundColor: getColor('bg-gray-1') },
      ]}
    >
      <View style={[tailwind('items-center justify-center mr-2.5'), { width: FILE_ICON_SIZE, height: FILE_ICON_SIZE }]}>
        {attachment.status === 'uploading' ? (
          <ActivityIndicator size="small" color={getColor('text-primary')} />
        ) : (
          <FileTypeIcon width={FILE_ICON_SIZE} height={FILE_ICON_SIZE} />
        )}
      </View>
      <View style={{ maxWidth: NAME_MAX_WIDTH }}>
        <AppText medium numberOfLines={1} style={[tailwind('text-sm'), { color: getColor('text-gray-100') }]}>
          {attachment.name}
        </AppText>
        {failure ? (
          <AppText numberOfLines={1} style={[tailwind('text-xs'), { color: getColor('text-red') }]}>
            {failureMessage}
          </AppText>
        ) : (
          size !== undefined && (
            <AppText style={[tailwind('text-xs'), { color: getColor('text-gray-50') }]}>{prettysize(size)}</AppText>
          )
        )}
      </View>
      {canRetry && renderActionButton(attachmentStrings.retry, ArrowClockwiseIcon, onRetry)}
      {renderActionButton(attachmentStrings.remove, XIcon, onRemove)}
    </View>
  );
};
