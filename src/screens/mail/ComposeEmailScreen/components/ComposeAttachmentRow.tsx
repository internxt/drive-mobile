import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import { formatMaxAttachmentSize } from '@internxt-mobile/services/mail/attachmentLimits';
import strings from '../../../../../assets/lang/strings';
import AppText from '../../../../components/AppText';
import useGetColor from '../../../../hooks/useColor';
import { ComposeAttachment } from '../hooks/useComposeAttachments';

/**
 * One attachment of the message being written, with how its upload is going.
 *
 * @param props.attachment - The attachment and how its upload is going.
 * @param props.disabled - Whether the attachment cannot be retried or removed right now.
 * @param props.onRetry - Uploads the file again after it failed.
 * @param props.onRemove - Takes the file out of the message.
 */
export const ComposeAttachmentRow = ({
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

  return (
    <View style={tailwind('flex-row items-center py-2')}>
      {attachment.status === 'uploading' && (
        <ActivityIndicator size="small" color={getColor('text-primary')} style={tailwind('mr-2')} />
      )}
      <View style={tailwind('flex-1 mr-2')}>
        <AppText numberOfLines={1} style={{ color: getColor('text-gray-100') }}>
          {attachment.name}
        </AppText>
        {!!failure && (
          <AppText style={[tailwind('text-xs'), { color: getColor('text-red') }]}>{failureMessage}</AppText>
        )}
      </View>
      {canRetry && (
        <TouchableOpacity
          disabled={disabled}
          onPress={onRetry}
          style={[tailwind('mr-4'), disabled && tailwind('opacity-50')]}
        >
          <AppText style={{ color: getColor('text-primary') }}>{attachmentStrings.retry}</AppText>
        </TouchableOpacity>
      )}
      <TouchableOpacity disabled={disabled} onPress={onRemove} style={disabled && tailwind('opacity-50')}>
        <AppText style={{ color: getColor('text-primary') }}>{attachmentStrings.remove}</AppText>
      </TouchableOpacity>
    </View>
  );
};
