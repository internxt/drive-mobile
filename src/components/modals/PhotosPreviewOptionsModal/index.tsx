import React, { useState } from 'react';
import { Text, View, Image, Alert } from 'react-native';
import prettysize from 'prettysize';
import globalStyle from '../../../styles/global';
import BottomModal from '../BottomModal';
import BottomModalOption from '../../BottomModalOption';
import strings from '../../../../assets/lang/strings';
import { ArrowSquareOut, CloudSlash, Copy, DownloadSimple, Info, Link, Trash, Wrench } from 'phosphor-react-native';
import { useTailwind } from 'tailwind-rn';
import useGetColor from 'src/hooks/useColor';
import AppText from 'src/components/AppText';
import { time } from '@internxt-mobile/services/common/time';
import { PhotosItemActions } from 'src/screens/PhotosPreviewScreen';
import { PhotosItem } from '@internxt-mobile/types/photos';
import photos from '@internxt-mobile/services/photos';
import { PhotosAnalyticsEventKey } from '@internxt-mobile/services/photos/analytics';
import fileSystemService from '@internxt-mobile/services/FileSystemService';
import FastImage from 'react-native-fast-image';
import appService from '@internxt-mobile/services/AppService';
import { PhotosPreviewFixerService } from '@internxt-mobile/services/photos/preview/photosPreviewFixer.service';
import { SdkManager } from '@internxt-mobile/services/common';
import LoadingSpinner from 'src/components/LoadingSpinner';

interface PhotosPreviewOptionsModalProps {
  data: PhotosItem;
  actions: PhotosItemActions;
  isOpen: boolean;
  size: number;
}

export function PhotosPreviewOptionsModal({
  actions,
  data,
  isOpen,
  size,
}: PhotosPreviewOptionsModalProps): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const [fixingPhoto, setFixingPhoto] = useState(false);

  const isSynced = data.photoFileId && data.photoId;
  const getUpdatedAt = () => {
    return time.getFormattedDate(data.updatedAt, time.formats.dateAtTime);
  };

  const handleFixPhoto = async () => {
    try {
      setFixingPhoto(true);
      if (!data.photoFileId && !data.photoId) throw new Error('Photo is not synced yet, nothing to fix');

      const syncedPhoto = await SdkManager.getInstance().photos.photos.getPhotoById(data.photoId as string);
      const needFix = PhotosPreviewFixerService.instance.needsFixing(syncedPhoto);

      if (!needFix) throw new Error('Photo is ok, nothing to fix');

      await PhotosPreviewFixerService.instance.fix(syncedPhoto);

      Alert.alert('Photo fixed', 'Photo has been fixed, restart the app to view repaired photo');
    } catch (error) {
      Alert.alert('Failed to repair photo', (error as Error).message ?? 'Something went wrong');
    } finally {
      setFixingPhoto(false);
    }
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
      icon: <Wrench size={22} color={getColor('text-gray-100')} />,
      disabled: fixingPhoto,
      visible: appService.isDevMode,
      label: (
        <View style={tailwind('flex-row justify-between')}>
          <AppText style={tailwind('text-lg text-gray-100')}>{strings.buttons.fixPhoto}</AppText>
          {fixingPhoto ? (
            <View style={tailwind('')}>
              <LoadingSpinner />
            </View>
          ) : null}
        </View>
      ),
      onPress: handleFixPhoto,
    },
    {
      icon: <Trash size={22} color={getColor('text-red')} />,
      disabled: false,
      label: <AppText style={tailwind('text-lg text-red')}>{strings.buttons.moveToThrash}</AppText>,
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
        {appService.isAndroid ? (
          <FastImage
            style={tailwind('bg-gray-10 w-10 h-10 rounded')}
            source={{ uri: fileSystemService.pathToUri(data.localPreviewPath) }}
          /> // Image component supports ph:// like URIs on iOS
        ) : (
          <Image
            style={tailwind('bg-gray-10 w-10 h-10 rounded ')}
            source={{ uri: fileSystemService.pathToUri(data.localPreviewPath) }}
          />
        )}
      </View>

      <View style={tailwind('flex-shrink w-full')}>
        <View style={tailwind('flex flex-row items-center')}>
          {!isSynced ? (
            <CloudSlash
              weight="bold"
              size={18}
              color={tailwind('text-gray-100').color as string}
              style={tailwind('mr-2')}
            />
          ) : null}
          <Text
            numberOfLines={1}
            ellipsizeMode="middle"
            style={[tailwind('text-base text-gray-100'), globalStyle.fontWeight.medium]}
          >
            {data.getDisplayName()}
          </Text>
        </View>
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
      <View style={tailwind('bg-white')}>
        {options
          .filter((option) => (option.visible !== undefined ? option.visible : true))
          .map((option, index) => {
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
    </BottomModal>
  );
}
