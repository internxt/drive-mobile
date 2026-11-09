import { DriveListViewMode, SortDirection, SortMode } from '@internxt-mobile/types/drive/ui';
import { BackButton } from '@internxt-mobile/ui-kit';
import strings from 'assets/lang/strings';
import {
  ArrowDown,
  ArrowUp,
  CheckCircleIcon,
  CircleIcon,
  DotsThree,
  MagnifyingGlass,
  Rows,
  SquaresFour,
} from 'phosphor-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleProp, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import Reanimated, { FadeIn, FadeOut, LayoutAnimationConfig } from 'react-native-reanimated';
import AppText from 'src/components/AppText';
import {
  SELECTION_ANIMATION_DURATION_MS,
  SELECTION_ANIMATION_EASING,
} from 'src/components/drive/lists/items/useSelectionProgress';
import { SelectionCheckbox } from 'src/components/drive/lists/items/SelectionCheckbox';
import { SearchInput } from 'src/components/SearchInput';
import { INCREASED_TOUCH_AREA } from 'src/styles/global';
import { useTailwind } from 'tailwind-rn';
import Separator from '../../../components/AppSeparator';
import useGetColor from '../../../hooks/useColor';
import { GlobalSearchModal } from './search/GlobalSearchModal';
import { SelectionCheckState } from './useDriveSelection';

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
  selectionConfig?: {
    selectedCount: number;
    checkState: SelectionCheckState;
    isSelectingAll: boolean;
    onSelectAllPress: () => void;
    onCancelPress: () => void;
  };
  onSelectPress?: () => void;
}

const SEARCH_BAR_HEIGHT = 52;
const GLOBAL_SEARCH_BUTTON_HEIGHT = 40;
const NAVIGATION_ROW_HEIGHT = 26;
const GRID_SELECT_ALL_ICON_SIZE = 28;
const TITLE_ROW_HEIGHT = 32;
const SELECTION_TITLE_FONT_VARIANT: TextStyle = { fontVariant: ['tabular-nums'] };
const HEADER_ROW_ENTERING = FadeIn.duration(SELECTION_ANIMATION_DURATION_MS).easing(SELECTION_ANIMATION_EASING);
const HEADER_ROW_EXITING = FadeOut.duration(SELECTION_ANIMATION_DURATION_MS).easing(SELECTION_ANIMATION_EASING);

export const getSelectionTitle = (selectedCount: number): string => {
  if (selectedCount === 0) {
    return strings.screens.drive.selection.noItemsSelected;
  }
  if (selectedCount === 1) {
    return strings.screens.drive.selection.itemSelected;
  }
  return strings.formatString(strings.screens.drive.selection.itemsSelected, selectedCount);
};

export const DriveFolderScreenHeader: React.FC<DriveFolderScreenHeaderProps> = (props) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const { label, canGoBack, onBackButtonPressed } = props.backButtonConfig;
  const { searchValue, searchVisible, onSearchButtonPress, onSearchTextChange } = props.searchConfig;
  const { sortMode, onSortButtonPress } = props.sortConfig;
  const { viewMode, onViewModeButtonPress } = props.viewConfig;

  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [isSearchInputFocused, setIsSearchInputFocused] = useState(false);
  const [selectionCancelWidth, setSelectionCancelWidth] = useState(0);

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

  const renderSelectAllCheckbox = (checkState: SelectionCheckState) => {
    if (viewMode === DriveListViewMode.Grid) {
      if (checkState === 'all') {
        return <CheckCircleIcon weight="fill" size={GRID_SELECT_ALL_ICON_SIZE} color={getColor('text-primary')} />;
      }
      if (checkState === 'some') {
        return <CheckCircleIcon size={GRID_SELECT_ALL_ICON_SIZE} color={getColor('text-gray-80')} />;
      }
      return <CircleIcon size={GRID_SELECT_ALL_ICON_SIZE} color={getColor('text-gray-40')} />;
    }
    return <SelectionCheckbox checked={checkState === 'all'} indeterminate={checkState === 'some'} shape="square" />;
  };

  const isRootSelectionMode = !!props.selectionConfig && !canGoBack;

  const renderSelectionRow = (
    selectionConfig: NonNullable<DriveFolderScreenHeaderProps['selectionConfig']>,
    style: StyleProp<ViewStyle>,
  ) => (
    <Reanimated.View
      key="selection"
      entering={HEADER_ROW_ENTERING}
      exiting={HEADER_ROW_EXITING}
      style={[tailwind('flex-row items-center'), style]}
    >
      <View style={[tailwind('items-start'), { minWidth: selectionCancelWidth }]}>
        <TouchableOpacity
          hitSlop={INCREASED_TOUCH_AREA}
          onPress={selectionConfig.onSelectAllPress}
          disabled={selectionConfig.isSelectingAll}
        >
          {selectionConfig.isSelectingAll ? (
            <ActivityIndicator color={getColor('text-primary')} />
          ) : (
            renderSelectAllCheckbox(selectionConfig.checkState)
          )}
        </TouchableOpacity>
      </View>
      <AppText
        medium
        style={[
          tailwind('text-base text-center flex-1 mx-2'),
          SELECTION_TITLE_FONT_VARIANT,
          { color: getColor('text-gray-100') },
        ]}
        numberOfLines={1}
      >
        {getSelectionTitle(selectionConfig.selectedCount)}
      </AppText>
      <TouchableOpacity
        hitSlop={INCREASED_TOUCH_AREA}
        onPress={selectionConfig.onCancelPress}
        onLayout={(event) => setSelectionCancelWidth(event.nativeEvent.layout.width)}
      >
        <AppText style={[tailwind('text-base'), { color: getColor('text-primary') }]}>{strings.buttons.cancel}</AppText>
      </TouchableOpacity>
    </Reanimated.View>
  );

  return (
    <LayoutAnimationConfig skipEntering>
      {props.selectionConfig &&
        canGoBack &&
        renderSelectionRow(props.selectionConfig, [tailwind('px-4 mb-2 mt-4'), { height: NAVIGATION_ROW_HEIGHT }])}
      {!props.selectionConfig && canGoBack && (
        <Reanimated.View
          entering={HEADER_ROW_ENTERING}
          exiting={HEADER_ROW_EXITING}
          style={[tailwind('flex-row items-center justify-between px-2 mb-2 mt-4'), { height: NAVIGATION_ROW_HEIGHT }]}
        >
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
        </Reanimated.View>
      )}

      <View style={[tailwind('flex-row items-center px-4'), { marginBottom: 14, height: TITLE_ROW_HEIGHT }]}>
        {isRootSelectionMode && props.selectionConfig ? (
          renderSelectionRow(props.selectionConfig, tailwind('flex-1'))
        ) : (
          <Reanimated.View
            key="title"
            entering={HEADER_ROW_ENTERING}
            exiting={HEADER_ROW_EXITING}
            style={tailwind('flex-1')}
          >
            <AppText
              style={[tailwind('text-2xl'), { color: getColor('text-gray-100') }]}
              medium
              ellipsizeMode="tail"
              numberOfLines={1}
            >
              {props.title}
            </AppText>
          </Reanimated.View>
        )}
        {props.onSelectPress && (
          <Reanimated.View entering={HEADER_ROW_ENTERING} exiting={HEADER_ROW_EXITING}>
            <TouchableOpacity style={tailwind('pl-3')} onPress={props.onSelectPress}>
              <AppText medium style={[tailwind('text-base'), { color: getColor('text-primary') }]}>
                {strings.buttons.select}
              </AppText>
            </TouchableOpacity>
          </Reanimated.View>
        )}
      </View>

      <Animated.View style={[tailwind('overflow-hidden'), { height: searchBarHeight, opacity: searchBarOpacity }]}>
        <SearchInput
          value={searchValue}
          onChangeText={onSearchTextChange}
          placeholder={strings.screens.drive.searchInThisFolder}
          onFocusChange={handleSearchInputFocusChange}
        />
      </Animated.View>
      {/* <Animated.View
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
      </Animated.View> */}

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
    </LayoutAnimationConfig>
  );
};
