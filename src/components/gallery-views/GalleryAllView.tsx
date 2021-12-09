import React, { useState } from 'react';
import CameraRoll from '@react-native-community/cameraroll';
import { Dimensions, FlatList, ListRenderItemInfo, RefreshControl, View } from 'react-native';
import { NavigationStackProp } from 'react-navigation-stack';
import { useNavigation } from '@react-navigation/native';

import { tailwind } from '../../helpers/designSystem';
import GalleryItem from '../GalleryItem';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { AppScreen } from '../../types';
import { photosActions, photosSelectors, photosThunks } from '../../store/slices/photos';

const GalleryAllView = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NavigationStackProp>();
  const isPhotoSelected = useAppSelector(photosSelectors.isPhotoSelected);
  const { isSelectionModeActivated, photos } = useAppSelector((state) => state.photos);
  const [refreshing, setRefreshing] = useState(false);
  const [columnsCount] = useState(3);
  const [gutter] = useState(3);
  const itemSize = (Dimensions.get('window').width - gutter * (columnsCount - 1)) / columnsCount;
  const selectItem = (photo: CameraRoll.PhotoIdentifier) => {
    dispatch(photosActions.selectPhoto(photo));
  };
  const deselectItem = (photo: CameraRoll.PhotoIdentifier) => {
    dispatch(photosActions.deselectPhoto(photo));
  };
  const onItemLongPressed = (photo: CameraRoll.PhotoIdentifier) => {
    dispatch(photosActions.setIsSelectionModeActivated(true));
    isPhotoSelected(photo) ? deselectItem(photo) : selectItem(photo);
  };
  const onItemPressed = (item: CameraRoll.PhotoIdentifier) => {
    isSelectionModeActivated
      ? onItemLongPressed(item)
      : navigation.push(AppScreen.PhotoPreview, { uri: item.node.image.uri });
  };

  return (
    <FlatList
      style={tailwind('bg-white')}
      showsVerticalScrollIndicator={true}
      indicatorStyle={'black'}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await dispatch(photosThunks.loadLocalPhotosThunk({}));
            setRefreshing(false);
          }}
        />
      }
      decelerationRate={0.5}
      ItemSeparatorComponent={() => <View style={{ height: gutter }} />}
      data={photos}
      numColumns={columnsCount}
      onEndReached={() => undefined}
      onEndReachedThreshold={3}
      keyExtractor={(item) => item.node.image.uri}
      renderItem={(item: ListRenderItemInfo<CameraRoll.PhotoIdentifier>) => {
        const uri = item.item.node.image.uri;
        const isTheLast = item.index === photos.length - 1;

        return (
          <>
            <GalleryItem
              size={itemSize}
              uri={uri}
              isSelected={isPhotoSelected(item.item)}
              onPress={() => onItemPressed(item.item)}
              onLongPress={() => onItemLongPressed(item.item)}
            />
            {!isTheLast && <View style={{ width: gutter }} />}
          </>
        );
      }}
    />
  );
};

export default GalleryAllView;
