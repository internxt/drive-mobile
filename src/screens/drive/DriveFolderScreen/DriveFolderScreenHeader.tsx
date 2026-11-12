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
import {
  ActivityIndicator,
  Animated,
  StyleProp,
  StyleSheet,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import Reanimated, { FadeIn, FadeOut, LayoutAnimationConfig } from 'react-native-reanimated';
import AppText from 'src/components/AppText';
import {
  SELECTION_ANIMATION_DURATION_MS,
  SELECTION_ANIMATION_EASING,
} from 'src/components/drive/lists/items/useSelectionProgress';
import { SelectionCheckbox } from 'src/components/drive/lists/items/SelectionCheckbox';
import { SearchInput } from 'src/components/SearchInput';
import { INCREASED_TOUCH_AREA } from 'src/styles/global';
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
const NAVIGATION_ROW_HORIZONTAL_PADDING = 8;
const SELECTION_ROW_HORIZONTAL_PADDING = 16;
const NAVIGATION_ROW_TOP_MARGIN = 16;
const NAVIGATION_ROW_BOTTOM_MARGIN = 8;

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
      style={[styles.selectionRow, style]}
    >
      <View className="items-start" style={{ minWidth: selectionCancelWidth }}>
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
        className="text-base text-center flex-1 mx-2"
        style={[SELECTION_TITLE_FONT_VARIANT, { color: getColor('text-gray-100') }]}
        numberOfLines={1}
      >
        {getSelectionTitle(selectionConfig.selectedCount)}
      </AppText>
      <TouchableOpacity
        hitSlop={INCREASED_TOUCH_AREA}
        onPress={selectionConfig.onCancelPress}
        onLayout={(event) => setSelectionCancelWidth(event.nativeEvent.layout.width)}
      >
        <AppText className="text-base" style={{ color: getColor('text-primary') }}>
          {strings.buttons.cancel}
        </AppText>
      </TouchableOpacity>
    </Reanimated.View>
  );

  return (
    <LayoutAnimationConfig skipEntering>
      {props.selectionConfig && canGoBack && renderSelectionRow(props.selectionConfig, styles.navigationSelectionRow)}
      {!props.selectionConfig && canGoBack && (
        <Reanimated.View entering={HEADER_ROW_ENTERING} exiting={HEADER_ROW_EXITING} style={styles.navigationRow}>
          <BackButton label={label} onPress={onBackButtonPressed} />

          <View className="flex-row -m-2">
            <View className="items-center justify-center">
              <TouchableOpacity className="p-2" onPress={onSearchButtonPress}>
                <MagnifyingGlass weight="bold" color={getColor('text-gray-80')} size={24} />
              </TouchableOpacity>
            </View>
            <View className="items-center justify-center">
              <TouchableOpacity className="p-2" onPress={props.onFolderActionsPress}>
                <DotsThree weight="bold" color={getColor('text-gray-80')} size={24} />
              </TouchableOpacity>
            </View>
          </View>
        </Reanimated.View>
      )}

      <View className="flex-row items-center px-4" style={{ marginBottom: 14, height: TITLE_ROW_HEIGHT }}>
        {isRootSelectionMode && props.selectionConfig ? (
          renderSelectionRow(props.selectionConfig, styles.fill)
        ) : (
          <Reanimated.View key="title" entering={HEADER_ROW_ENTERING} exiting={HEADER_ROW_EXITING} style={styles.fill}>
            <AppText
              className="text-2xl"
              style={{ color: getColor('text-gray-100') }}
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
            <TouchableOpacity className="pl-3" onPress={props.onSelectPress}>
              <AppText medium className="text-base" style={{ color: getColor('text-primary') }}>
                {strings.buttons.select}
              </AppText>
            </TouchableOpacity>
          </Reanimated.View>
        )}
      </View>

      <Animated.View style={[styles.searchBar, { height: searchBarHeight, opacity: searchBarOpacity }]}>
        <SearchInput
          value={searchValue}
          onChangeText={onSearchTextChange}
          placeholder={strings.screens.drive.searchInThisFolder}
          onFocusChange={handleSearchInputFocusChange}
        />
      </Animated.View>
      {/* <Animated.View
        style={[
          { overflow: 'hidden', paddingHorizontal: SELECTION_ROW_HORIZONTAL_PADDING },
          { height: globalSearchButtonHeight, opacity: globalSearchButtonOpacity },
        ]}
      >
        <TouchableOpacity onPress={handleGlobalSearchPress} className="py-2" activeOpacity={0.7}>
          <AppText className="text-sm text-center" style={{ color: getColor('text-primary') }} medium>
            {strings.screens.drive.searchInAllFolders}
          </AppText>
        </TouchableOpacity>
      </Animated.View> */}

      <View className="flex-row justify-between items-center px-4">
        <TouchableOpacity onPress={onSortButtonPress}>
          <View className="flex-row items-center">
            <AppText className="text-base mr-1" style={{ color: getColor('text-gray-80') }}>
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
          <View className="py-2">
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

const styles = StyleSheet.create({
  selectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navigationSelectionRow: {
    paddingHorizontal: SELECTION_ROW_HORIZONTAL_PADDING,
    marginTop: NAVIGATION_ROW_TOP_MARGIN,
    marginBottom: NAVIGATION_ROW_BOTTOM_MARGIN,
    height: NAVIGATION_ROW_HEIGHT,
  },
  navigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: NAVIGATION_ROW_HORIZONTAL_PADDING,
    marginTop: NAVIGATION_ROW_TOP_MARGIN,
    marginBottom: NAVIGATION_ROW_BOTTOM_MARGIN,
    height: NAVIGATION_ROW_HEIGHT,
  },
  fill: {
    flex: 1,
  },
  searchBar: {
    overflow: 'hidden',
  },
});
