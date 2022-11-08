import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import prettysize from 'prettysize';
import globalStyle from '../../../styles/global';
import BottomModal from '../BottomModal';
import BottomModalOption from '../../BottomModalOption';
import strings from '../../../../assets/lang/strings';
import { items } from '@internxt/lib';
import { useTailwind } from 'tailwind-rn';
import { time } from '@internxt-mobile/services/common/time';
import AppText from 'src/components/AppText';
import { PhotosItem } from '@internxt-mobile/types/photos';
import { PhotosItemActions } from 'src/screens/PhotosPreviewScreen';

interface PhotosPreviewInfoModalProps {
  data: PhotosItem;
  actions: PhotosItemActions;
  isOpen: boolean;
  size: number;
}

function PhotosPreviewInfoModal({ isOpen, actions, data, size }: PhotosPreviewInfoModalProps): JSX.Element {
  const tailwind = useTailwind();

  const header = (
    <View style={tailwind('flex-row')}>
      <View style={tailwind('mr-3')}>
        <Image style={tailwind('bg-neutral-30 w-10 h-10 rounded ')} source={{ uri: data.localPreviewPath }} />
      </View>

      <View style={tailwind('flex-shrink w-full')}>
        <Text
          numberOfLines={1}
          ellipsizeMode="middle"
          style={[tailwind('text-base text-gray-100'), globalStyle.fontWeight.medium]}
        >
          {items.getItemDisplayName({
            name: data.name,
            type: data.format,
          })}
        </Text>
        <View style={tailwind('flex flex-row items-center')}>
          <AppText style={tailwind('text-xs text-gray-60')}>{prettysize(size)}</AppText>
          <View style={[tailwind('bg-gray-60 rounded-full mx-1.5'), { width: 3, height: 3 }]} />
          <AppText style={tailwind('text-xs text-gray-60')}>
            {time.getFormattedDate(data.updatedAt, time.formats.dateAtTime)}
          </AppText>
        </View>
      </View>
    </View>
  );

  const options = [
    {
      label: strings.modals.photos_preview_info_modal.options.name,
      value: items.getItemDisplayName({
        name: data.name,
        type: data.format,
      }),
    },
    {
      label: strings.modals.photos_preview_info_modal.options.uploaded,
      value: time.getFormattedDate(data.takenAt, time.formats.dateAtTime),
    },
    {
      label: strings.modals.photos_preview_info_modal.options.modified,
      value: time.getFormattedDate(data.updatedAt, time.formats.dateAtTime),
    },
    {
      label: strings.modals.photos_preview_info_modal.options.size,
      value: prettysize(size),
    },
    {
      label: strings.modals.photos_preview_info_modal.options.dimensions,
      value: `${data.width} x ${data.height}`,
    },
    {
      label: strings.modals.photos_preview_info_modal.options.format,
      value: data.format.toUpperCase(),
    },
  ];
  return (
    <BottomModal isOpen={isOpen} onClosed={() => actions.closeModal('preview-info')} header={header}>
      <View style={tailwind('bg-neutral-10 flex-grow')}>
        <View style={tailwind('bg-white')}>
          {options.map((opt, index) => {
            return (
              <BottomModalOption
                key={index}
                leftSlot={
                  <View style={tailwind('flex-grow')}>
                    <AppText style={tailwind('text-lg text-gray-100')}>{opt.label}</AppText>
                  </View>
                }
                rightSlot={
                  <AppText numberOfLines={1} ellipsizeMode="middle" style={tailwind('text-base text-gray-60 mr-4')}>
                    {opt.value}
                  </AppText>
                }
              />
            );
          })}
        </View>
      </View>
    </BottomModal>
  );
}

export default PhotosPreviewInfoModal;
