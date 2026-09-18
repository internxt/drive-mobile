import { ArrowBendDoubleUpLeftIcon, ArrowBendUpLeftIcon, ArrowBendUpRightIcon } from 'phosphor-react-native';
import { TouchableOpacity, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import strings from '../../../../assets/lang/strings';
import AppText from '../../../components/AppText';
import useGetColor from '../../../hooks/useColor';

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
        tailwind('flex-1 flex-row items-center justify-center rounded-full px-2 py-3'),
        { backgroundColor: getColor('bg-gray-5') },
      ]}
    >
      <ActionIcon color={getColor('text-gray-80')} size={18} />
      <AppText numberOfLines={1} style={[tailwind('ml-1.5 text-sm'), { color: getColor('text-gray-80') }]}>
        {label}
      </AppText>
    </TouchableOpacity>
  );
};

export const MessageActions = ({
  isBusy,
  canReplyAll,
  canForward,
  onReply,
  onReplyAll,
  onForward,
}: {
  isBusy: boolean;
  canReplyAll: boolean;
  canForward: boolean;
  onReply: () => void;
  onReplyAll: () => void;
  onForward: () => void;
}) => {
  const tailwind = useTailwind();
  const { actions } = strings.screens.email_detail;

  return (
    <View style={tailwind('flex-row')}>
      <MessageAction label={actions.reply} icon={ArrowBendUpLeftIcon} isDisabled={isBusy} onPress={onReply} />
      {canReplyAll && (
        <>
          <View style={tailwind('w-2')} />
          <MessageAction
            label={actions.replyAll}
            icon={ArrowBendDoubleUpLeftIcon}
            isDisabled={isBusy}
            onPress={onReplyAll}
          />
        </>
      )}
      {canForward && (
        <>
          <View style={tailwind('w-2')} />
          <MessageAction label={actions.forward} icon={ArrowBendUpRightIcon} isDisabled={isBusy} onPress={onForward} />
        </>
      )}
    </View>
  );
};
