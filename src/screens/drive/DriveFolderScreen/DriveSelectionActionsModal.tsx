import { ArrowsOutCardinalIcon, DownloadSimpleIcon, TrashIcon } from 'phosphor-react-native';
import { View } from 'react-native';
import AppText from 'src/components/AppText';
import BottomModalOption from 'src/components/BottomModalOption';
import BottomModal from 'src/components/modals/BottomModal';
import useGetColor from 'src/hooks/useColor';
import globalStyle from 'src/styles/global';
import { useTailwind } from 'tailwind-rn';
import StackedFilesIllustration from '../../../../assets/icons/stacked-files.svg';
import strings from '../../../../assets/lang/strings';
import { getSelectionTitle } from './DriveFolderScreenHeader';

const ILLUSTRATION_SIZE = 76;
const ILLUSTRATION_CONTAINER_SIZE = 48;
const OPTION_ICON_SIZE = 20;

interface DriveSelectionActionsModalProps {
  isOpen: boolean;
  selectedCount: number;
  moveDisabled: boolean;
  trashDisabled: boolean;
  onMovePress: () => void;
  onTrashPress: () => void;
  onClose: () => void;
}

export const DriveSelectionActionsModal = ({
  isOpen,
  selectedCount,
  moveDisabled,
  trashDisabled,
  onMovePress,
  onTrashPress,
  onClose,
}: DriveSelectionActionsModalProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const iconColor = getColor('text-gray-80');

  const options = [
    {
      label: strings.buttons.move,
      icon: <ArrowsOutCardinalIcon size={OPTION_ICON_SIZE} color={iconColor} />,
      color: getColor('text-gray-100'),
      disabled: moveDisabled,
      onPress: onMovePress,
    },
    {
      label: strings.buttons.download,
      icon: <DownloadSimpleIcon size={OPTION_ICON_SIZE} color={iconColor} />,
      color: getColor('text-gray-100'),
      disabled: true,
    },
    {
      label: strings.buttons.moveToThrash,
      icon: <TrashIcon size={OPTION_ICON_SIZE} color={getColor('text-red')} />,
      color: getColor('text-red'),
      disabled: trashDisabled,
      onPress: onTrashPress,
    },
  ];

  const header = (
    <View style={tailwind('flex-row items-center')}>
      <View
        style={[
          tailwind('mr-3 items-center justify-center'),
          { width: ILLUSTRATION_CONTAINER_SIZE, height: ILLUSTRATION_CONTAINER_SIZE },
        ]}
      >
        <StackedFilesIllustration width={ILLUSTRATION_SIZE} height={ILLUSTRATION_SIZE} />
      </View>
      <AppText style={[tailwind('text-base'), { color: getColor('text-gray-100') }, globalStyle.fontWeight.medium]}>
        {getSelectionTitle(selectedCount)}
      </AppText>
    </View>
  );

  return (
    <BottomModal
      safeAreaColor={getColor('bg-surface')}
      style={{ backgroundColor: getColor('bg-gray-5') }}
      isOpen={isOpen}
      onClosed={onClose}
      header={header}
    >
      <View style={tailwind('p-4')}>
        <View style={[tailwind('rounded-2xl overflow-hidden'), { backgroundColor: getColor('bg-surface') }]}>
          {options.map((option, index) => (
            <BottomModalOption
              disabled={option.disabled}
              onPress={option.onPress}
              key={option.label}
              leftSlot={option.icon}
              rightSlot={
                <View style={tailwind('flex-grow items-center justify-center flex-row')}>
                  <AppText style={[tailwind('text-lg'), { color: option.color }]}>{option.label}</AppText>
                </View>
              }
              hideBorderBottom={index === options.length - 1}
            />
          ))}
        </View>
      </View>
    </BottomModal>
  );
};
