import { RowsIcon, SquaresFourIcon } from 'phosphor-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../../assets/lang/strings';
import { colors, fontStyles } from '../../theme';
import { DriveViewMode } from '../../types';

interface SortRowProps {
  viewMode: DriveViewMode;
  onToggleViewMode: () => void;
}

export const SortRow = ({ viewMode, onToggleViewMode }: SortRowProps) => {
  const tailwind = useTailwind();

  return (
    <View style={tailwind('flex-row items-center justify-between px-4 pb-1')}>
      <Text style={[tailwind('text-xs text-gray-60'), fontStyles.regular]}>
        {strings.screens.ShareExtension.sortByName}
      </Text>
      <TouchableOpacity onPress={onToggleViewMode} hitSlop={8}>
        {viewMode === 'list' ? (
          <SquaresFourIcon size={22} color={colors.gray60} />
        ) : (
          <RowsIcon size={22} color={colors.gray60} />
        )}
      </TouchableOpacity>
    </View>
  );
};
