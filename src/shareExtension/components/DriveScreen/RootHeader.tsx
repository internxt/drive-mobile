import { MagnifyingGlassIcon } from 'phosphor-react-native';
import { Text, TextInput, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../../assets/lang/strings';
import { fontStyles, useShareColors } from '../../theme';
import { TextButton } from '../TextButton';

interface RootHeaderProps {
  searchQuery: string;
  onChangeSearch: (value: string) => void;
  onNewFolder: () => void;
}

export const RootHeader = ({ searchQuery, onChangeSearch, onNewFolder }: RootHeaderProps) => {
  const tailwind = useTailwind();
  const colors = useShareColors();

  return (
    <>
      <View style={[tailwind('flex-row justify-between px-4 pt-3 pb-2'), { alignItems: 'baseline' }]}>
        <Text style={[tailwind('flex-1 text-2xl mr-2'), fontStyles.bold, { color: colors.gray100 }]} numberOfLines={1}>
          {strings.screens.ShareExtension.rootFolderName}
        </Text>
        <TextButton title={strings.buttons.newFolder} onPress={onNewFolder} />
      </View>

      <View style={[tailwind('flex-row items-center mx-4 mb-2 px-3 py-2'), { borderRadius: 10, backgroundColor: colors.gray5 }]}>
        <MagnifyingGlassIcon size={16} color={colors.gray40} style={{ marginRight: 6 }} />
        <TextInput
          style={[tailwind('flex-1 text-base'), { padding: 0, ...fontStyles.regular, color: colors.gray100 }]}
          placeholder={strings.screens.ShareExtension.searchPlaceholder}
          placeholderTextColor={colors.gray40}
          value={searchQuery}
          onChangeText={onChangeSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>
    </>
  );
};
