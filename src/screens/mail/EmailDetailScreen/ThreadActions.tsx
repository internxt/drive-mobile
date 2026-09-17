import { EnvelopeIcon, type Icon, TrashIcon, WarningIcon } from 'phosphor-react-native';
import { TouchableOpacity, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import strings from '../../../../assets/lang/strings';
import AppText from '../../../components/AppText';
import useGetColor from '../../../hooks/useColor';

type ThreadAction = {
  key: string;
  label: string;
  icon: Icon;
  onPress: () => void;
};

export const ThreadActions = ({
  isDisabled,
  onMarkUnread,
  onMoveToSpam,
  onMoveToTrash,
}: {
  isDisabled: boolean;
  onMarkUnread: () => void;
  onMoveToSpam: () => void;
  onMoveToTrash: () => void;
}) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const { actions } = strings.screens.email_detail;

  const threadActions: ThreadAction[] = [
    { key: 'markUnread', label: actions.markUnread, icon: EnvelopeIcon, onPress: onMarkUnread },
    { key: 'spam', label: actions.spam, icon: WarningIcon, onPress: onMoveToSpam },
    { key: 'trash', label: actions.trash, icon: TrashIcon, onPress: onMoveToTrash },
  ];

  return (
    <View
      style={[
        tailwind('flex-row items-center justify-around py-2'),
        { borderBottomWidth: 1, borderBottomColor: getColor('border-gray-5') },
      ]}
    >
      {threadActions.map(({ key, label, icon: ActionIcon, onPress }) => (
        <TouchableOpacity key={key} onPress={onPress} disabled={isDisabled} style={tailwind('items-center px-4 py-2')}>
          <ActionIcon color={getColor('text-gray-80')} size={22} />
          <AppText numberOfLines={1} style={[tailwind('text-xs mt-1'), { color: getColor('text-gray-80') }]}>
            {label}
          </AppText>
        </TouchableOpacity>
      ))}
    </View>
  );
};
