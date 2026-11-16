import { MagnifyingGlassIcon } from 'phosphor-react-native';
import { Text, TextInput, View } from 'react-native';
import strings from '../../../../assets/lang/strings';
import { fontStyles, useShareColors } from '../../theme';
import { TextButton } from '../TextButton';

interface RootHeaderProps {
  searchQuery: string;
  onChangeSearch: (value: string) => void;
  onNewFolder: () => void;
}

export const RootHeader = ({ searchQuery, onChangeSearch, onNewFolder }: RootHeaderProps) => {
  const colors = useShareColors();

  return (
    <>
      <View className="flex-row justify-between px-4 pt-3 pb-2" style={{ alignItems: 'baseline' }}>
        <Text className="flex-1 text-2xl mr-2" style={[fontStyles.bold, { color: colors.gray100 }]} numberOfLines={1}>
          {strings.screens.ShareExtension.rootFolderName}
        </Text>
        <TextButton title={strings.buttons.newFolder} onPress={onNewFolder} />
      </View>

      <View
        className="flex-row items-center mx-4 mb-2 px-3 py-2"
        style={{ borderRadius: 10, backgroundColor: colors.gray5 }}
      >
        <MagnifyingGlassIcon size={16} color={colors.gray40} style={{ marginRight: 6 }} />
        <TextInput
          className="flex-1 text-base"
          style={{ padding: 0, ...fontStyles.regular, color: colors.gray100 }}
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
