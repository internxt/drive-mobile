import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import prettysize from 'prettysize';
import globalStyle from '../../../styles/global';
import BottomModal from '../BottomModal';
import BottomModalOption from '../../BottomModalOption';
import strings from '../../../../assets/lang/strings';
import { ArrowSquareOut, Copy, DownloadSimple, Info, Link, Trash } from 'phosphor-react-native';
import { useTailwind } from 'tailwind-rn';
import useGetColor from 'src/hooks/useColor';
import AppText from 'src/components/AppText';
import { time } from '@internxt-mobile/services/common/time';
import { PhotosItemActions } from 'src/screens/PhotosPreviewScreen';
import { PhotosItem } from '@internxt-mobile/types/photos';
import photos from '@internxt-mobile/services/photos';
import { PhotosAnalyticsEventKey } from '@internxt-mobile/services/photos/analytics';

interface PhotosPreviewOptionsModalProps {
  data: PhotosItem;
  actions: PhotosItemActions;
  isOpen: boolean;
}

export function PhotosPreviewOptionsModal({ actions, data, isOpen }: PhotosPreviewOptionsModalProps): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  const [size, setSize] = useState(0);
  useEffect(() => {
    data.getSize().then(setSize);
  }, [data]);
  const getUpdatedAt = () => {
    return time.getFormattedDate(data.updatedAt, time.formats.dateAtTime);
  };

  const options = [
    {
      icon: <Info size={22} color={getColor('text-gray-100')} />,
      disabled: false,
      label: <AppText style={tailwind('text-lg text-gray-100')}>{strings.buttons.info}</AppText>,
      onPress: () => {
        actions.closeModal('preview-options');
        // Needs to schedule this in 1ms or React
        // will skip updates
        setTimeout(() => {
          actions.openModal('preview-info');
        }, 1);
      },
    },
    {
      icon: <ArrowSquareOut size={22} color={getColor('text-gray-100')} />,
      disabled: false,
      label: <AppText style={tailwind('text-lg text-gray-100')}>{strings.buttons.export_file}</AppText>,
      onPress: actions.exportPhoto,
    },
    {
      icon: <DownloadSimple size={22} color={getColor('text-gray-100')} />,
      disabled: false,
      label: <AppText style={tailwind('text-lg text-gray-100')}>{strings.buttons.save_to_gallery}</AppText>,
      onPress: actions.saveToGallery,
    },
    {
      icon: <Copy size={22} color={getColor('text-gray-100')} />,
      disabled: false,
      label: <AppText style={tailwind('text-lg text-gray-100')}>{strings.buttons.copyLink}</AppText>,
      onPress: actions.copyLink,
    },
    {
      icon: <Link size={22} color={getColor('text-gray-100')} />,
      disabled: false,
      label: (
        <AppText style={tailwind('text-lg text-gray-100')}>
          {strings.components.file_and_folder_options.shareLink}
        </AppText>
      ),
      onPress: actions.shareLink,
    },
    {
      icon: <Trash size={22} color={getColor('text-red-')} />,
      disabled: false,
      label: <AppText style={tailwind('text-lg text-red-')}>{strings.buttons.moveToThrash}</AppText>,
      onPress: () => {
        photos.analytics.track(PhotosAnalyticsEventKey.MoveToTrashSelected, {
          individual_action: true,
          number_of_items: 1,
        });
        actions.openModal('trash');
      },
    },
  ];
  const header = (
    <View style={tailwind('flex-row')}>
      <View style={tailwind('mr-3')}>
        <Image style={tailwind('bg-neutral-30 w-10 h-10 rounded')} source={{ uri: data.localPreviewPath }} />
      </View>

      <View style={tailwind('flex-shrink w-full')}>
        <Text
          numberOfLines={1}
          ellipsizeMode="middle"
          style={[tailwind('text-base text-neutral-500'), globalStyle.fontWeight.medium]}
        >
          {data.getDisplayName()}
        </Text>
        <View style={tailwind('flex flex-row items-center')}>
          <AppText style={tailwind('text-xs text-gray-60')}>{prettysize(size)}</AppText>
          <View style={[tailwind('bg-gray-60 rounded-full mx-1.5'), { width: 3, height: 3 }]} />
          <AppText style={tailwind('text-xs text-gray-60')}>{getUpdatedAt()}</AppText>
        </View>
      </View>
    </View>
  );

  return (
    <BottomModal isOpen={isOpen} onClosed={() => actions.closeModal('preview-options')} header={header}>
      <View style={tailwind('bg-neutral-10 flex-grow')}>
        <View style={tailwind('bg-white')}>
          {options.map((option, index) => {
            return (
              <BottomModalOption
                disabled={option.disabled || !option.onPress}
                key={index}
                leftSlot={option.icon}
                rightSlot={option.label}
                onPress={option.onPress}
              />
            );
          })}
        </View>
      </View>
    </BottomModal>
  );
}
