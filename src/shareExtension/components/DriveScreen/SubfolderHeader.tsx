import { CaretLeftIcon, MagnifyingGlassIcon } from 'phosphor-react-native';
import { Animated, Text, TextInput, TouchableOpacity, View } from 'react-native';
import strings from '../../../../assets/lang/strings';
import { UseSearchAnimationResult } from '../../hooks/useSearchAnimation';
import { fontStyles, useShareColors } from '../../theme';
import { TextButton } from '../TextButton';

interface SubfolderHeaderProps {
  folderName: string;
  parentName: string;
  onBack: () => void;
  searchQuery: string;
  onChangeSearch: (q: string) => void;
  onClearSearch: () => void;
  onNewFolder: () => void;
  searchAnim: UseSearchAnimationResult;
}

export const SubfolderHeader = ({
  folderName,
  parentName,
  onBack,
  searchQuery,
  onChangeSearch,
  onClearSearch,
  onNewFolder,
  searchAnim,
}: SubfolderHeaderProps) => {
  const colors = useShareColors();
  const { searchHeight, searchOpacity, isSearchOpen, searchRef, toggleSearch } = searchAnim;

  const handleSearchPress = () => toggleSearch(onClearSearch);

  return (
    <>
      <View className="flex-row items-center justify-between px-4 pt-3">
        <TouchableOpacity className="flex-row items-center" onPress={onBack} hitSlop={8}>
          <CaretLeftIcon size={18} color={colors.primary} style={{ marginLeft: -4 }} />
          <Text className="text-base ml-1" style={[fontStyles.regular, { color: colors.primary }]} numberOfLines={1}>
            {parentName}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSearchPress} hitSlop={8}>
          <MagnifyingGlassIcon size={20} color={isSearchOpen ? colors.primary : colors.gray60} />
        </TouchableOpacity>
      </View>

      <Animated.View style={{ height: searchHeight, opacity: searchOpacity, overflow: 'hidden' }}>
        <View
          className="flex-row items-center mx-4 mt-2 px-3 py-2"
          style={{ borderRadius: 10, backgroundColor: colors.gray5 }}
        >
          <MagnifyingGlassIcon size={16} color={colors.gray40} style={{ marginRight: 6 }} />
          <TextInput
            ref={searchRef}
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
      </Animated.View>

      <View className="flex-row justify-between px-4 mt-1 pb-2" style={{ alignItems: 'baseline' }}>
        <Text className="flex-1 text-2xl mr-2" style={[fontStyles.bold, { color: colors.gray100 }]} numberOfLines={1}>
          {folderName}
        </Text>
        <TextButton title={strings.buttons.newFolder} onPress={onNewFolder} />
      </View>
    </>
  );
};
