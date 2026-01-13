import { time } from '@internxt-mobile/services/common/time';
import { driveFileService } from '@internxt-mobile/services/drive/file';
import { items } from '@internxt/lib';
import { ArrowCircleUp } from 'phosphor-react-native';
import prettysize from 'prettysize';
import { useEffect, useState } from 'react';
import { Animated, Easing, InteractionManager, TouchableHighlight, View } from 'react-native';
import FastImage from 'react-native-fast-image';
import { useTailwind } from 'tailwind-rn';
import { FolderIcon, getFileTypeIcon } from '../../../../../helpers';
import useGetColor from '../../../../../hooks/useColor';
import { DownloadedThumbnail, DriveItemProps, DriveItemStatus } from '../../../../../types/drive';
import AppText from '../../../../AppText';

function DriveGridModeItemComp(props: DriveItemProps): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const spinValue = new Animated.Value(1);
  const [downloadedThumbnail, setDownloadedThumbnail] = useState<DownloadedThumbnail | null>(null);
  const [maxThumbnailWidth, setMaxThumbnailWidth] = useState<number | null>(null);
  const thumbnailSize = downloadedThumbnail || null;
  const IconFile = getFileTypeIcon(props.data.type || '');
  const iconSize = 80;
  const isFolder = props.data.isFolder;
  const isUploading = props.status === DriveItemStatus.Uploading;
  const isDownloading = props.status === DriveItemStatus.Downloading;
  const maxThumbnailHeight = 96;

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
    if (props.data.thumbnails && props.data.thumbnails.length && !downloadedThumbnail) {
      InteractionManager.runAfterInteractions(() => {
        driveFileService.getThumbnail(props.data.thumbnails[0]).then((downloadedThumbnail) => {
          setDownloadedThumbnail(downloadedThumbnail);
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

  const renderThumbnail = (thumbnail: { width: number; height: number; uri: string }) => {
    const height = getThumbnailHeight();
    const width = getThumbnailWidth();
    return (
      <View
        style={{
          height,
          width,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 1,
          },
          shadowOpacity: 0.2,
          shadowRadius: 2.22,
        }}
      >
        <FastImage
          source={{ uri: thumbnail.uri }}
          style={[
            {
              height,
              width,
              borderRadius: 6,
            },
          ]}
          resizeMode="cover"
        />
      </View>
    );
  };

  return (
    <TouchableHighlight
      disabled={isUploading || isDownloading}
      underlayColor={getColor('bg-gray-5')}
      onLongPress={props.onActionsPress}
      onPress={props.onPress}
      onLayout={(event) => {
        !maxThumbnailWidth && setMaxThumbnailWidth(Math.floor(event.nativeEvent.layout.width) - 8);
      }}
      style={[{ flex: 1 }, tailwind('mb-2 rounded-lg')]}
    >
      <View>
        <View style={[tailwind('flex-grow'), tailwind('flex-col items-center justify-center')]}>
          <View style={tailwind('w-full items-center justify-center')}>
            <View style={tailwind('h-24 w-24 flex items-center justify-center')}>
              {isFolder ? (
                <FolderIcon width={iconSize} height={iconSize} style={isUploading && tailwind('opacity-40')} />
              ) : downloadedThumbnail ? (
                renderThumbnail(downloadedThumbnail)
              ) : (
                <IconFile width={iconSize} height={iconSize} />
              )}
            </View>

            {isUploading && (
              <View style={tailwind('absolute top-0 bottom-0 w-full flex-row items-center justify-center')}>
                <View style={[tailwind('rounded px-1 py-0.5 flex-row'), { backgroundColor: getColor('text-primary') }]}>
                  <ArrowCircleUp weight="fill" color={getColor('text-white')} size={16} />
                  <AppText style={[tailwind('ml-1.5 text-xs'), { color: getColor('text-white') }]}>
                    {((props.progress || 0) * 100).toFixed(0) + '%'}
                  </AppText>
                </View>
              </View>
            )}
          </View>

          <View style={[tailwind('flex items-start justify-center items-center mt-2.5 px-2 py-1')]}>
            <AppText
              style={[
                tailwind('text-base text-center leading-5'),
                { color: getColor('text-gray-100') },
                isUploading && tailwind('opacity-40'),
                { lineHeight: 16 * 1.2 },
              ]}
              numberOfLines={2}
              ellipsizeMode={'middle'}
            >
              {items.getItemDisplayName(props.data)}
            </AppText>
            <AppText style={[tailwind('text-xs mt-1'), { color: getColor('text-gray-50') }, { lineHeight: 14 }]}>
              {time.getFormattedDate(props.data.createdAt, time.formats.shortDate)}
            </AppText>
            {props.data.size ? (
              <AppText style={[tailwind('text-xs'), { color: getColor('text-gray-50') }]}>
                {prettysize(props.data.size)}
              </AppText>
            ) : null}
          </View>
        </View>
      </View>
    </TouchableHighlight>
  );
}

export const DriveGridModeItem = DriveGridModeItemComp;
