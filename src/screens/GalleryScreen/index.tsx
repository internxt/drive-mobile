import CameraRoll from '@react-native-community/cameraroll';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ListRenderItemInfo,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { connect } from 'react-redux';

import { tailwind } from '../../helpers/designSystem';
import { loadLocalPhotos } from '../../services/photos';
import globalStyle from '../../styles/global.style';
import { AppScreen } from '../../types';
import ScreenTitle from '../../components/ScreenTitle';
import strings from '../../../assets/lang/strings';
import GalleryItem from '../../components/GalleryItem';
import { useNavigation } from '@react-navigation/native';
import { NavigationStackProp } from 'react-navigation-stack';

enum PhotoGroupBy {
  Years = 'years',
  Months = 'months',
  Days = 'days',
  All = 'all',
}

function GalleryScreen(): JSX.Element {
  const navigation = useNavigation<NavigationStackProp>();
  const [columnsCount] = useState(3);
  const [gutter] = useState(3);
  const itemSize = (Dimensions.get('window').width - gutter * (columnsCount - 1)) / columnsCount;
  const [refreshing, setRefreshing] = useState(false);
  const [isSelectionModeActivated, setIsSelectionModeActivated] = useState(false);
  const [selectedItems, setSelectedItems] = useState<CameraRoll.PhotoIdentifier[]>([]);
  const [groupBy, setGroupBy] = useState(PhotoGroupBy.All);
  const [photos, setPhotos] = useState<CameraRoll.PhotoIdentifier[]>([]);
  const [photoCursor, setPhotoCursor] = useState<string>(undefined);
  const loadPhotos = async (cursor?: string) => {
    const [loadedPhotos, nextCursor] = await loadLocalPhotos(cursor);

    setPhotos([...photos, ...loadedPhotos]);
    setPhotoCursor(nextCursor);
    setRefreshing(false);
  };
  const isItemSelected = (item: CameraRoll.PhotoIdentifier) => {
    return selectedItems.some((i) => i.node.image.filename === item.node.image.filename);
  };
  const selectItem = (item: CameraRoll.PhotoIdentifier) => {
    setSelectedItems([...selectedItems, item]);
  };
  const deselectItem = (item: CameraRoll.PhotoIdentifier) => {
    const itemIndex = selectedItems.findIndex((i) => i.node.image.filename === item.node.image.filename);

    selectedItems.splice(itemIndex, 1);

    setSelectedItems([...selectedItems]);
  };
  const onSelectButtonPressed = () => {
    setIsSelectionModeActivated(true);
  };
  const onCancelSelectButtonPressed = () => {
    setIsSelectionModeActivated(false);
    setSelectedItems([]);
  };
  const onSelectAllButtonPressed = () => {
    setSelectedItems([...photos]);
  };
  const onItemLongPressed = (item: CameraRoll.PhotoIdentifier) => {
    setIsSelectionModeActivated(true);
    isItemSelected(item) ? deselectItem(item) : selectItem(item);
  };
  const onItemPressed = (item: CameraRoll.PhotoIdentifier) => {
    isSelectionModeActivated
      ? onItemLongPressed(item)
      : navigation.push(AppScreen.PhotoPreview, { uri: item.node.image.uri });
  };
  const groupByMenu = (function () {
    const groupByItems = Object.entries(PhotoGroupBy).map(([, value]) => {
      const isActive = value === groupBy;

      return (
        <TouchableWithoutFeedback key={value} onPress={() => setGroupBy(value)}>
          <View style={[tailwind('flex-1 rounded-2xl'), isActive && tailwind('bg-neutral-70')]}>
            <Text style={[tailwind('text-neutral-500 text-center text-base'), isActive && tailwind('text-white')]}>
              {strings.screens.gallery.groupBy[value]}
            </Text>
          </View>
        </TouchableWithoutFeedback>
      );
    });

    return (
      <View style={tailwind('absolute bottom-3 px-5 w-full')}>
        <View style={tailwind('px-1 py-1 flex-row bg-neutral-20 rounded-2xl')}>{groupByItems}</View>
      </View>
    );
  })();

  useEffect(() => {
    loadPhotos();
  }, []);

  return (
    <View style={tailwind('app-screen bg-white flex-1')}>
      {/* TOP BAR */}
      <View style={tailwind('flex-row justify-between pb-3 h-16')}>
        {isSelectionModeActivated ? (
          <>
            <View style={tailwind('flex-row items-center justify-between')}>
              <Text style={tailwind('pl-5')}>
                {strings.formatString(strings.screens.gallery.nPhotosSelected, selectedItems.length)}
              </Text>
            </View>

            <View style={tailwind('flex-row pr-5')}>
              <View style={tailwind('flex-row items-center justify-between')}>
                <TouchableOpacity
                  style={tailwind('bg-blue-10 px-3.5 py-1 rounded-3xl mr-2')}
                  onPress={onSelectAllButtonPressed}
                >
                  <Text style={[tailwind('text-blue-60'), globalStyle.fontWeight.medium]}>
                    {strings.components.buttons.selectAll}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={tailwind('flex-row items-center justify-between')}>
                <TouchableOpacity
                  style={tailwind('bg-blue-10 px-3.5 py-1 rounded-3xl')}
                  onPress={onCancelSelectButtonPressed}
                >
                  <Text style={[tailwind('text-blue-60'), globalStyle.fontWeight.medium]}>
                    {strings.components.buttons.cancel}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
          <>
            <ScreenTitle text={strings.screens.gallery.title} showBackButton={false} />

            <View style={tailwind('flex-row items-center justify-between pr-5')}>
              <TouchableOpacity style={tailwind('bg-blue-10 px-3.5 py-1 rounded-3xl')} onPress={onSelectButtonPressed}>
                <Text style={[tailwind('text-blue-60'), globalStyle.fontWeight.medium]}>
                  {strings.components.buttons.select}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* PHOTOS */}
      <FlatList
        style={tailwind('bg-yellow-20')}
        showsVerticalScrollIndicator={true}
        indicatorStyle={'black'}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);

              loadPhotos();
            }}
          />
        }
        decelerationRate={0.5}
        ItemSeparatorComponent={() => <View style={{ height: gutter }} />}
        data={photos}
        numColumns={3}
        onEndReached={() => loadPhotos(photoCursor)}
        onEndReachedThreshold={3}
        renderItem={(item: ListRenderItemInfo<CameraRoll.PhotoIdentifier>) => {
          const uri = item.item.node.image.uri;
          const isTheLast = item.index === photos.length - 1;

          return (
            <>
              <GalleryItem
                key={item.item.node.image.uri}
                size={itemSize}
                uri={uri}
                onPress={() => onItemPressed(item.item)}
                onLongPress={() => onItemLongPressed(item.item)}
              />
              {!isTheLast && <View style={{ width: gutter }} />}
            </>
          );
        }}
      />

      {/*  GROUP BY MENU */}
      {groupByMenu}
    </View>
  );
}

export default GalleryScreen;
