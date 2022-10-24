import React, { useEffect, useState } from 'react';
import { View, TouchableHighlight, Animated, Easing, Image } from 'react-native';

import { FolderIcon, getFileTypeIcon } from '../../helpers';
import globalStyle from '../../styles/global';
import { useAppSelector } from '../../store/hooks';
import { ArrowCircleUp } from 'phosphor-react-native';
import { items } from '@internxt/lib';
import AppText from '../AppText';

import { DriveItemProps } from '../../types/drive';
import useDriveItem from '../../hooks/useDriveItem';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../hooks/useColor';
import drive from '@internxt-mobile/services/drive';
import { time } from '@internxt-mobile/services/common/time';
import prettysize from 'prettysize';

function DriveItemGrid(props: DriveItemProps): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const { selectedItems } = useAppSelector((state) => state.drive);
  const isSelectionMode = selectedItems.length > 0;
  const spinValue = new Animated.Value(1);
  const [thumbnailPath, setThumbnailPath] = useState<string | null>(null);
  const [maxThumbnailWidth, setMaxThumbnailWidth] = useState<number | null>(null);
  const [thumbnailSize, setThumbnailSize] = useState<{ width: number; height: number } | null>(null);
  const IconFile = getFileTypeIcon(props.data.type || '');
  const iconSize = 80;

  const { isFolder, isUploading, isDownloading, onItemPressed, onItemLongPressed } = useDriveItem(props);

  const maxThumbnailHeight = 96;
  const thumbnail = props.data.currentThumbnail || props.data.thumbnails ? props.data.thumbnails[0] : null;

  const getThumbnailWidth = () => {
    if (!thumbnailSize || !maxThumbnailWidth) return 0;

    const thumbnailWidth = thumbnailSize ? (thumbnailSize.width * maxThumbnailHeight) / thumbnailSize.height : 0;
    return thumbnailWidth > maxThumbnailWidth ? maxThumbnailWidth : thumbnailWidth;
  };

  const getThumbnailHeight = () => {
    const thumbnailHeight = thumbnailSize ? (thumbnailSize.height * getThumbnailWidth()) / thumbnailSize.width : 0;

    return thumbnailHeight > maxThumbnailHeight ? maxThumbnailHeight : thumbnailHeight;
  };

  useEffect(() => {
    if (thumbnail && !thumbnailPath) {
      drive.file.getThumbnail(props.data.currentThumbnail || props.data.thumbnails[0]).then((path) => {
        Image.getSize(path, (width, height) => {
          setThumbnailSize({ width, height });
          setThumbnailPath(path);
        });
      });
    }
  }, [props.data]);

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 0,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  const renderThumbnail = () => {
    return (
      <View
        style={{
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 1,
          },
          shadowOpacity: 0.2,
          shadowRadius: 2.22,
        }}
      >
        <Image
          borderRadius={10}
          source={{ uri: thumbnailPath as string }}
          style={[
            tailwind('rounded bg-debug'),
            {
              height: getThumbnailHeight(),
              width: getThumbnailWidth() - 10,
            },
          ]}
          resizeMode={'cover'}
        />
      </View>
    );
  };
  return (
    <TouchableHighlight
      disabled={isUploading || isDownloading}
      underlayColor={getColor('text-neutral-20')}
      onLongPress={onItemLongPressed}
      onPress={onItemPressed}
      onLayout={(event) => {
        !maxThumbnailWidth && setMaxThumbnailWidth(Math.floor(event.nativeEvent.layout.width) - 8);
      }}
      style={[{ flex: 1 / 3 }, tailwind('p-2 mb-5 rounded-lg')]}
    >
      <View>
        <View style={[tailwind('flex-grow overflow-hidden'), tailwind('flex-col items-center justify-center')]}>
          <View style={tailwind('w-full mb-1.5 items-center justify-center')}>
            <View style={tailwind('h-24 flex items-center justify-center')}>
              {isFolder ? (
                <FolderIcon width={iconSize} height={iconSize} style={isUploading && tailwind('opacity-40')} />
              ) : thumbnailPath ? (
                renderThumbnail()
              ) : (
                <IconFile width={iconSize} height={iconSize} />
              )}
            </View>

            {isUploading && (
              <View style={tailwind('absolute top-0 bottom-0 w-full flex-row items-center justify-center')}>
                <View style={tailwind('rounded px-1 py-0.5 bg-blue-60 flex-row')}>
                  <ArrowCircleUp weight="fill" color={getColor('text-white')} size={16} />
                  <AppText style={tailwind('ml-1.5 text-xs text-white')}>
                    {((props.progress || 0) * 100).toFixed(0) + '%'}
                  </AppText>
                </View>
              </View>
            )}
          </View>

          <View style={[tailwind('flex items-start justify-center items-center mt-1.5')]}>
            <AppText
              style={[
                tailwind('text-base text-gray-100 text-center px-2.5 leading-5'),
                isUploading && tailwind('opacity-40'),
                globalStyle.fontWeight.medium,
              ]}
              numberOfLines={2}
              ellipsizeMode={'middle'}
            >
              {items.getItemDisplayName(props.data)}
            </AppText>
            <AppText style={tailwind('text-xs text-gray-50 mt-2')}>
              {time.getFormattedDate(props.data.createdAt, time.formats.shortDate)}
            </AppText>
            {props.data.size ? (
              <AppText style={tailwind('text-xs text-gray-50')}>{prettysize(props.data.size)}</AppText>
            ) : null}
          </View>
        </View>
      </View>
    </TouchableHighlight>
  );
}

export default DriveItemGrid;
