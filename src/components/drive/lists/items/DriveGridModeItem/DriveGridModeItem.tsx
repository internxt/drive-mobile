import { time } from '@internxt-mobile/services/common/time';
import strings from '../../../../../../assets/lang/strings';
import { useDownloadedThumbnail } from '@internxt-mobile/hooks/drive';
import { items } from '@internxt/lib';
import { ArrowCircleUpIcon, XCircleIcon } from 'phosphor-react-native';
import prettysize from 'prettysize';
import { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { TouchableHighlight, TouchableOpacity, View } from 'react-native';
import Animated, { interpolate, interpolateColor, useAnimatedStyle } from 'react-native-reanimated';
import { useTailwind } from 'tailwind-rn';
import { FolderIcon, getFileTypeIcon } from '../../../../../helpers';
import useGetColor from '../../../../../hooks/useColor';
import { DriveItemStatus } from '../../../../../types/drive/item';
import { DriveItemProps } from '../../../../../types/drive/ui';
import AppText from '../../../../AppText';
import { LONG_PRESS_DELAY_MS } from '../itemPress';
import { SelectionCheckbox } from '../SelectionCheckbox';
import { useSelectionModeProgress } from '../SelectionModeContext';
import { useSelectionProgress } from '../useSelectionProgress';

const PREVIEW_BOX_SIZE = 96;
const SELECTED_PREVIEW_INSET = 4;
const SELECTED_PREVIEW_SCALE = (PREVIEW_BOX_SIZE - 2 * SELECTED_PREVIEW_INSET) / PREVIEW_BOX_SIZE;

function DriveGridModeItemComp(props: DriveItemProps): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const downloadedThumbnail = useDownloadedThumbnail(props.data);
  const [maxThumbnailWidth, setMaxThumbnailWidth] = useState<number | null>(null);
  const thumbnailSize = downloadedThumbnail || null;
  const IconFile = getFileTypeIcon(props.data.type || '');
  const iconSize = 80;
  const isFolder = props.data.isFolder;
  const isUploading = props.status === DriveItemStatus.Uploading;
  const isDownloading = props.status === DriveItemStatus.Downloading;
  const isFolderUploading = isUploading && isFolder && !!props.folderUploadProgress;
  const isFolderScanning = isUploading && isFolder && !props.folderUploadProgress;
  const maxThumbnailHeight = 96;
  const selectionProgress = useSelectionProgress(!!props.isSelected);
  const selectedNameBackgroundColor = getColor('bg-gray-10');
  const hasThumbnail = !isFolder && !!downloadedThumbnail;
  const previewAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: hasThumbnail ? interpolate(selectionProgress.value, [0, 1], [1, SELECTED_PREVIEW_SCALE]) : 1 },
    ],
  }));
  const selectionModeProgress = useSelectionModeProgress();
  const checkboxAnimatedStyle = useAnimatedStyle(() => ({
    opacity: selectionModeProgress.value,
  }));
  const nameAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(selectionProgress.value, [0, 1], ['transparent', selectedNameBackgroundColor]),
  }));

  const getThumbnailWidth = () => {
    if (!thumbnailSize || !maxThumbnailWidth) return 0;

    const thumbnailWidth = thumbnailSize ? (thumbnailSize.width * maxThumbnailHeight) / thumbnailSize.height : 0;
    return thumbnailWidth > maxThumbnailWidth ? maxThumbnailWidth : thumbnailWidth;
  };

  const getThumbnailHeight = () => {
    const thumbnailHeight = thumbnailSize ? (thumbnailSize.height * getThumbnailWidth()) / thumbnailSize.width : 0;

    return thumbnailHeight > maxThumbnailHeight ? maxThumbnailHeight : thumbnailHeight;
  };

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
        <Image
          source={{ uri: thumbnail.uri }}
          style={[
            {
              height,
              width,
              borderRadius: 6,
            },
          ]}
          contentFit="cover"
        />
      </View>
    );
  };

  const renderUploadOverlay = () => {
    if (!isUploading) return null;

    if (isFolderScanning) {
      return (
        <TouchableOpacity
          onPress={props.onActionsPress}
          accessibilityLabel={'Cancel folder upload'}
          className="absolute top-0 bottom-0 w-full flex-row items-center justify-center"
        >
          <View
            className="rounded px-1 py-0.5 flex-row items-center"
            style={{ backgroundColor: getColor('text-primary') }}
          >
            <AppText className="text-xs" style={{ color: getColor('text-white') }}>
              {strings.screens.drive.scanningFolderShort}
            </AppText>
            <XCircleIcon weight="bold" color={getColor('text-white')} size={14} style={tailwind('ml-1')} />
          </View>
        </TouchableOpacity>
      );
    }

    if (isFolderUploading) {
      return (
        <TouchableOpacity
          onPress={props.onActionsPress}
          accessibilityLabel={'Cancel folder upload'}
          className="absolute top-0 bottom-0 w-full flex-row items-center justify-center"
        >
          <View
            className="rounded px-1 py-0.5 flex-row items-center"
            style={{ backgroundColor: getColor('text-primary') }}
          >
            <ArrowCircleUpIcon weight="fill" color={getColor('text-white')} size={14} />
            <AppText className="ml-1 text-xs" style={{ color: getColor('text-white') }}>
              {props.folderUploadProgress?.totalFiles
                ? `${props.folderUploadProgress.uploadedFiles}/${props.folderUploadProgress.totalFiles}`
                : '...'}
            </AppText>
            <XCircleIcon weight="bold" color={getColor('text-white')} size={14} style={tailwind('ml-1')} />
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <View className="absolute top-0 bottom-0 w-full flex-row items-center justify-center">
        <View className="rounded px-1 py-0.5 flex-row" style={{ backgroundColor: getColor('text-primary') }}>
          <ArrowCircleUpIcon weight="fill" color={getColor('text-white')} size={16} />
          <AppText className="ml-1.5 text-xs" style={{ color: getColor('text-white') }}>
            {((props.progress || 0) * 100).toFixed(0) + '%'}
          </AppText>
        </View>
      </View>
    );
  };

  const previewContent = useMemo(() => {
    if (isFolder) {
      return <FolderIcon width={iconSize} height={iconSize} style={isUploading && tailwind('opacity-40')} />;
    }
    if (downloadedThumbnail) {
      return renderThumbnail(downloadedThumbnail);
    }
    return <IconFile width={iconSize} height={iconSize} />;
  }, [isFolder, isUploading, downloadedThumbnail, maxThumbnailWidth, props.data.type]);

  const nameColor = getColor('text-gray-100');
  const nameText = useMemo(
    () => (
      <AppText
        className={`text-base text-center leading-5 ${isUploading ? 'opacity-40' : ''}`}
        style={[{ color: nameColor }, { lineHeight: 16 * 1.2 }]}
        numberOfLines={2}
        ellipsizeMode={'middle'}
      >
        {items.getItemDisplayName(props.data)}
      </AppText>
    ),
    [props.data, isUploading, nameColor],
  );

  const detailsColor = getColor('text-gray-50');
  const detailsText = useMemo(
    () => (
      <>
        {props.data.createdAt ? (
          <AppText className="text-xs mt-1" style={[{ color: detailsColor }, { lineHeight: 14 }]}>
            {time.getFormattedDate(props.data.createdAt, time.formats.shortDate)}
          </AppText>
        ) : null}
        {props.data.size ? (
          <AppText className="text-xs" style={{ color: detailsColor }}>
            {prettysize(props.data.size)}
          </AppText>
        ) : null}
      </>
    ),
    [props.data.createdAt, props.data.size, detailsColor],
  );

  return (
    <TouchableHighlight
      disabled={!isFolderUploading && (isUploading || isDownloading)}
      underlayColor={getColor('bg-gray-5')}
      onLongPress={props.onLongPress ?? props.onActionsPress}
      delayLongPress={LONG_PRESS_DELAY_MS}
      onPress={props.onPress}
      onLayout={(event) => {
        !maxThumbnailWidth && setMaxThumbnailWidth(Math.floor(event.nativeEvent.layout.width) - 8);
      }}
      className="mb-2 rounded-lg"
      style={{ flex: 1 }}
    >
      <View>
        <View className="flex-grow flex-col items-center justify-center">
          <View className="w-full items-center justify-center">
            <Animated.View style={[tailwind('h-24 w-24 flex items-center justify-center'), previewAnimatedStyle]}>
              {previewContent}
              {props.selectable && (
                <Animated.View style={[tailwind('absolute items-center justify-center'), checkboxAnimatedStyle]}>
                  <SelectionCheckbox checked={!!props.isSelected} shape="circle" />
                </Animated.View>
              )}
            </Animated.View>

            {renderUploadOverlay()}
          </View>

          <View className="flex items-start justify-center items-center mt-2.5 px-2 py-1">
            <Animated.View style={[tailwind('rounded-md px-1 overflow-hidden'), nameAnimatedStyle]}>
              {nameText}
            </Animated.View>
            {detailsText}
          </View>
        </View>
      </View>
    </TouchableHighlight>
  );
}

export const DriveGridModeItem = DriveGridModeItemComp;
