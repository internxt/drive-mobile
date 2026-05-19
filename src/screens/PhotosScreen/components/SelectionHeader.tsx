import { StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from 'src/components/AppText';
import useGetColor from 'src/hooks/useColor';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../../assets/lang/strings';

interface SelectionHeaderProps {
  selectedCount: number;
  onCancel: () => void;
}

const SelectionHeader = ({ selectedCount, onCancel }: SelectionHeaderProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  const label =
    selectedCount === 1
      ? strings.screens.photos.selection.itemSelected
      : strings.formatString(strings.screens.photos.selection.itemsSelected, selectedCount);

  return (
    <View
      style={[
        tailwind('pt-4'),
        styles.border,
        { backgroundColor: getColor('bg-surface'), borderBottomColor: getColor('border-gray-10') },
      ]}
    >
      <View style={tailwind('flex-row items-center h-11')}>
        <TouchableOpacity
          onPress={onCancel}
          style={tailwind('px-5 py-2.5 ml-1')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <AppText medium style={[tailwind('text-base'), { color: getColor('text-primary') }]}>
            {strings.screens.photos.selection.cancel}
          </AppText>
        </TouchableOpacity>

        <View style={tailwind('flex-1 items-center justify-center')}>
          <AppText medium style={[tailwind('text-base'), { color: getColor('text-gray-100') }]}>
            {label}
          </AppText>
        </View>

        <View style={styles.cancelSpacer} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  border: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cancelSpacer: {
    width: 80,
  },
});

export default SelectionHeader;
