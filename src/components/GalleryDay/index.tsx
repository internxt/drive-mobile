import React, { useState } from 'react';
import { Dimensions, FlatList, ListRenderItemInfo, Text, TouchableWithoutFeedback, View } from 'react-native';
import { Photo } from '@internxt/sdk/dist/photos';
import { useNavigation } from '@react-navigation/native';
import moment from 'moment';
import { CheckCircle } from 'phosphor-react-native';

import { getColor, tailwind } from '../../helpers/designSystem';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import GalleryItem from '../GalleryItem';
import { photosActions, photosSelectors } from '../../store/slices/photos';
import { PhotosScreenNavigationProp } from '../../types/navigation';

interface GalleryDayProps {
  year: number;
  month: number;
  day: number;
  photos: { data: Photo; preview: string }[];
}

const GalleryDay = ({ year, month, day, photos }: GalleryDayProps): JSX.Element => {
  const dispatch = useAppDispatch();
  //const navigation = useNavigation<PhotosScreenNavigationProp<'PhotosGallery'>>();
  const isPhotoSelected = useAppSelector(photosSelectors.isPhotoSelected);
  const arePhotosSelected = useAppSelector(photosSelectors.arePhotosSelected);
  //const { isSelectionModeActivated } = useAppSelector((state) => state.photos);
  const [columnsCount] = useState(3);
  const [gutter] = useState(3);
  const itemSize = (Dimensions.get('window').width - gutter * (columnsCount - 1)) / columnsCount;
  const date = moment().year(year).month(month).date(day);
  const dateLabel = date.format('dddd, DD MMMM');
  const areAllPhotosSelected = arePhotosSelected(photos.map((p) => p.data));
  const selectAll = () => {
    dispatch(photosActions.setIsSelectionModeActivated(true));
    dispatch(photosActions.selectPhotos(photos.map((p) => p.data)));
  };
  const deselectAll = () => {
    dispatch(photosActions.deselectPhotos(photos.map((p) => p.data)));
  };
  const selectItem = (photo: Photo) => {
    dispatch(photosActions.selectPhotos([photo]));
  };
  const deselectItem = (photo: Photo) => {
    dispatch(photosActions.deselectPhotos([photo]));
  };
  const onItemLongPressed = (photo: Photo) => {
    dispatch(photosActions.setIsSelectionModeActivated(true));
    isPhotoSelected(photo) ? deselectItem(photo) : selectItem(photo);
  };
  /*  const onItemPressed = (item: Photo, preview: string) => {
    isSelectionModeActivated ? onItemLongPressed(item) : navigation.navigate('PhotosPreview', { data: item, preview });
  }; */

  return (
    <View style={tailwind('mb-6')}>
      {/* TITLE */}
      <View style={tailwind('flex-row justify-between px-5 mb-6')}>
        <Text style={tailwind('text-base text-neutral-500')}>{dateLabel}</Text>
        {areAllPhotosSelected ? (
          <TouchableWithoutFeedback onPress={deselectAll}>
            <View style={[tailwind('w-6 h-6 bg-blue-60 flex justify-center items-center rounded-2xl')]}>
              <CheckCircle color={getColor('white')} size={32} />
            </View>
          </TouchableWithoutFeedback>
        ) : (
          <TouchableWithoutFeedback onPress={selectAll}>
            <View style={[tailwind('bg-white w-6 h-6 flex justify-center items-center rounded-xl')]}>
              <CheckCircle color={getColor('neutral-60')} size={32} />
            </View>
          </TouchableWithoutFeedback>
        )}
      </View>

      {/* PHOTOS LIST */}
      <FlatList
        listKey={`${year}-${month}-${day}`}
        scrollEnabled={false}
        style={tailwind('bg-white')}
        ItemSeparatorComponent={() => <View style={{ height: gutter }} />}
        data={photos}
        numColumns={columnsCount}
        keyExtractor={(item) => item.data.id}
        ListFooterComponent={<View style={{ width: gutter }} />}
        renderItem={(item: ListRenderItemInfo<{ data: Photo; preview: string }>) => {
          return (
            <>
              <GalleryItem
                size={itemSize}
                data={item.item.data}
                isSelected={isPhotoSelected(item.item.data)}
                onPress={() => {
                  /* onItemPressed(item.item.data, item.item.preview); */
                }}
                onLongPress={() => onItemLongPressed(item.item.data)}
              />
            </>
          );
        }}
      />
    </View>
  );
};

export default GalleryDay;
