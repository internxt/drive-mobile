import { DriveListViewMode, SortDirection } from '@internxt-mobile/types/drive';
import { BackButton } from '@internxt-mobile/ui-kit';
import strings from 'assets/lang/strings';
import { ArrowDown, ArrowUp, DotsThree, MagnifyingGlass, Rows, SquaresFour } from 'phosphor-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, TouchableOpacity, View } from 'react-native';
import AppText from 'src/components/AppText';
import { SortMode } from 'src/components/modals/SortModal';
import { SearchInput } from 'src/components/SearchInput';
import { useTailwind } from 'tailwind-rn';
import Separator from '../../../components/AppSeparator';
import useGetColor from '../../../hooks/useColor';
import { GlobalSearchModal } from './search/GlobalSearchModal';

export interface DriveFolderScreenHeaderProps {
  title: string;
  onFolderActionsPress: () => void;
  backButtonConfig: {
    label: string;
    canGoBack: boolean;
    onBackButtonPressed: () => void;
  };
  searchConfig: {
    searchVisible: boolean;
    searchValue: string;
    onSearchTextChange: (value: string) => void;
    onSearchButtonPress: () => void;
  };
  sortConfig: {
    sortMode: SortMode;
    onSortButtonPress: () => void;
  };
  viewConfig: {
    viewMode: DriveListViewMode;
    onViewModeButtonPress: () => void;
  };
}

const SEARCH_BAR_HEIGHT = 52;
const GLOBAL_SEARCH_BUTTON_HEIGHT = 32;

export const DriveFolderScreenHeader: React.FC<DriveFolderScreenHeaderProps> = (props) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const { label, canGoBack, onBackButtonPressed } = props.backButtonConfig;
  const { searchValue, searchVisible, onSearchButtonPress, onSearchTextChange } = props.searchConfig;
  const { sortMode, onSortButtonPress } = props.sortConfig;
  const { viewMode, onViewModeButtonPress } = props.viewConfig;

  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [isSearchInputFocused, setIsSearchInputFocused] = useState(false);

  const searchBarHeight = useRef(new Animated.Value(searchVisible ? SEARCH_BAR_HEIGHT : 0)).current;
  const searchBarOpacity = useRef(new Animated.Value(searchVisible ? 1 : 0)).current;
  const globalSearchButtonHeight = useRef(new Animated.Value(0)).current;
  const globalSearchButtonOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(searchBarHeight, {
      useNativeDriver: false,
      duration: 250,
      toValue: searchVisible ? SEARCH_BAR_HEIGHT : 0,
    }).start();

    Animated.timing(searchBarOpacity, {
      useNativeDriver: false,
      duration: 250,
      toValue: searchVisible ? 1 : 0,
    }).start();
  }, [searchVisible]);

  useEffect(() => {
    const shouldShow = searchVisible && isSearchInputFocused;

    Animated.timing(globalSearchButtonHeight, {
      useNativeDriver: false,
      duration: 200,
      toValue: shouldShow ? GLOBAL_SEARCH_BUTTON_HEIGHT : 0,
    }).start();

    Animated.timing(globalSearchButtonOpacity, {
      useNativeDriver: false,
      duration: 200,
      toValue: shouldShow ? 1 : 0,
    }).start();
  }, [searchVisible, isSearchInputFocused]);

  const handleGlobalSearchPress = () => {
    setShowGlobalSearch(true);
  };

  const handleSearchInputFocusChange = (isFocused: boolean) => {
    setIsSearchInputFocused(isFocused);
  };

  return (
    <>
      {canGoBack && (
        <View style={tailwind('flex-row items-center justify-between px-2 mb-2 mt-4')}>
          <BackButton label={label} onPress={onBackButtonPressed} />

          <View style={tailwind('flex-row -m-2')}>
            <View style={tailwind('items-center justify-center')}>
              <TouchableOpacity style={tailwind('p-2')} onPress={onSearchButtonPress}>
                <MagnifyingGlass weight="bold" color={getColor('text-gray-80')} size={24} />
              </TouchableOpacity>
            </View>
            <View style={tailwind('items-center justify-center')}>
              <TouchableOpacity style={tailwind('p-2')} onPress={props.onFolderActionsPress}>
                <DotsThree weight="bold" color={getColor('text-gray-80')} size={24} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <View style={[tailwind('px-4'), { marginBottom: 14 }]}>
        <AppText
          style={[tailwind('text-2xl'), { color: getColor('text-gray-100') }]}
          medium
          ellipsizeMode="tail"
          numberOfLines={1}
        >
          {props.title}
        </AppText>
      </View>

      <Animated.View style={[tailwind('overflow-hidden'), { height: searchBarHeight, opacity: searchBarOpacity }]}>
        <SearchInput
          value={searchValue}
          onChangeText={onSearchTextChange}
          placeholder={strings.screens.drive.searchInThisFolder}
          onFocusChange={handleSearchInputFocusChange}
        />
      </Animated.View>
      <Animated.View
        style={[
          tailwind('overflow-hidden px-4'),
          { height: globalSearchButtonHeight, opacity: globalSearchButtonOpacity },
        ]}
      >
        <TouchableOpacity onPress={handleGlobalSearchPress} style={tailwind('py-2')} activeOpacity={0.7}>
          <AppText style={[tailwind('text-sm text-center'), { color: getColor('text-primary') }]} medium>
            {strings.screens.drive.searchInAllFolders}
          </AppText>
        </TouchableOpacity>
      </Animated.View>

      <View style={[tailwind('flex-row justify-between items-center px-4')]}>
        <TouchableOpacity onPress={onSortButtonPress}>
          <View style={tailwind('flex-row items-center')}>
            <AppText style={[tailwind('text-base mr-1'), { color: getColor('text-gray-80') }]}>
              {strings.screens.drive.sort[sortMode.type]}
            </AppText>
            {sortMode.direction === SortDirection.Asc ? (
              <ArrowUp weight="bold" size={15} color={getColor('text-gray-80')} />
            ) : (
              <ArrowDown weight="bold" size={15} color={getColor('text-gray-80')} />
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={onViewModeButtonPress}>
          <View style={tailwind('py-2')}>
            {viewMode === 'list' ? (
              <SquaresFour size={22} color={getColor('text-gray-80')} />
            ) : (
              <Rows size={22} color={getColor('text-gray-80')} />
            )}
          </View>
        </TouchableOpacity>
      </View>

      <Separator />
      <GlobalSearchModal visible={showGlobalSearch} onClose={() => setShowGlobalSearch(false)} />
    </>
  );
};
