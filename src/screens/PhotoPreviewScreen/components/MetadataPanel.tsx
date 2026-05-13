import { CaretLeftIcon } from 'phosphor-react-native';
import { MutableRefObject, useEffect, useRef, useState } from 'react';
import { Image, ScrollView, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../../assets/lang/strings';
import AppText from '../../../components/AppText';
import useGetColor from '../../../hooks/useColor';
import { stripFileUri } from '../../../services/common/uri/uriHelpers';
import fileSystemService from '../../../services/FileSystemService';
import { photosLocalDB } from '../../../services/photos/database/photosLocalDB';
import { photoMediaLibraryService } from '../../../services/photos/PhotoMediaLibraryService';
import { CloudPhotoItem, PhotoItem, TimelinePhotoItem } from '../../PhotosScreen/types';
import { formatBytes, formatDate, formatDimensions, formatExtension } from '../utils/formatters';

const photoPreviewStrings = strings.screens.photos.photoPreview;

const SEPARATOR_ROW = 'rgba(249,249,252)';
const SEPARATOR_SECTION = 'rgba(243,243,248)';

const ROW_HEIGHT = 52;

interface MetadataRow {
  label: string;
  value: string;
}

const Row = ({ label, value, isLast }: MetadataRow & { isLast: boolean }) => {
  const tailwind = useTailwind();
  return (
    <View
      style={[
        tailwind('flex-row items-center px-2'),
        { height: ROW_HEIGHT, borderBottomWidth: isLast ? 0 : 1, borderBottomColor: SEPARATOR_ROW },
      ]}
    >
      <AppText medium style={tailwind('text-base text-gray-100')}>
        {label}
      </AppText>
      <AppText style={[tailwind('flex-1 text-base text-gray-60'), { textAlign: 'right' }]} numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
};

const formatHeaderSubtitleFromLocal = (fileSize: number | null, creationTime: number | null): string => {
  if (fileSize && creationTime) return `${formatBytes(fileSize)} · ${formatDate(creationTime)}`;
  if (creationTime) return formatDate(creationTime);
  return '';
};

const formatCloudDisplayName = (
  plainName: string | null | undefined,
  extension: string | null | undefined,
  fallbackFileName: string,
): string => {
  if (!plainName) return fallbackFileName;
  const extensionSuffix = extension ? `.${extension}` : '';
  return `${plainName}${extensionSuffix}`;
};

const formatCloudHeaderSubtitle = (fileSize: number | null | undefined, createdAt: number): string => {
  if (fileSize) return `${formatBytes(fileSize)} · ${formatDate(createdAt)}`;
  return formatDate(createdAt);
};

const resolveLocalFileSize = async (
  assetId: string,
  cachedFileSize: number | null,
  localUri: string | null,
): Promise<number | null> => {
  if (cachedFileSize) return cachedFileSize;
  if (!localUri) return null;
  try {
    const fileStat = await fileSystemService.stat(stripFileUri(localUri));
    photosLocalDB.cacheAssetFileSize(assetId, fileStat.size).catch(() => undefined);
    return fileStat.size;
  } catch (error) {
    console.error('Failed to get file size for', localUri, error);
    return null;
  }
};

const buildLocalMetadata = async (
  localItem: PhotoItem,
  mountedRef: MutableRefObject<boolean>,
  setHeaderName: (name: string) => void,
  setHeaderSubtitle: (subtitle: string) => void,
  setRows: (rows: MetadataRow[]) => void,
): Promise<void> => {
  const cachedAssetStatus = await photosLocalDB.getStatus(localItem.id);
  let fileName = cachedAssetStatus?.fileName ?? null;
  let creationTime = cachedAssetStatus?.creationTime ?? null;
  let width = cachedAssetStatus?.width ?? null;
  let height = cachedAssetStatus?.height ?? null;

  const assetInfo = await photoMediaLibraryService.getAssetInfo(localItem.id);
  fileName ??= assetInfo.filename;
  creationTime ??= assetInfo.creationTime;
  const modificationTime: number | null = assetInfo.modificationTime ?? null;
  width ??= assetInfo.width;
  height ??= assetInfo.height;

  const fileSize = await resolveLocalFileSize(
    localItem.id,
    cachedAssetStatus?.fileSize ?? null,
    assetInfo.localUri ?? null,
  );

  const metadataRows: MetadataRow[] = [
    { label: photoPreviewStrings.metadata.info, value: fileName ?? '-' },
    { label: photoPreviewStrings.metadata.uploaded, value: creationTime ? formatDate(creationTime) : '-' },
    ...(fileSize ? [{ label: photoPreviewStrings.metadata.size, value: formatBytes(fileSize) }] : []),
    { label: photoPreviewStrings.metadata.modified, value: modificationTime ? formatDate(modificationTime) : '-' },
    {
      label: photoPreviewStrings.metadata.dimensions,
      value: width && height ? formatDimensions(width, height) : '-',
    },
    { label: photoPreviewStrings.metadata.format, value: fileName ? formatExtension(fileName) : '-' },
  ];

  if (mountedRef.current) {
    setHeaderName(fileName ?? '');
    setHeaderSubtitle(formatHeaderSubtitleFromLocal(fileSize, creationTime));
    setRows(metadataRows);
  }
};

const buildCloudMetadata = async (
  cloudItem: CloudPhotoItem,
  mountedRef: MutableRefObject<boolean>,
  setHeaderName: (name: string) => void,
  setHeaderSubtitle: (subtitle: string) => void,
  setRows: (rows: MetadataRow[]) => void,
): Promise<void> => {
  const cloudAsset = await photosLocalDB.getCloudAssetById(cloudItem.id);
  const displayName = formatCloudDisplayName(cloudAsset?.plainName, cloudAsset?.extension, cloudItem.fileName);
  const modificationTimestamp = cloudAsset?.modificationTime ?? cloudAsset?.updatedAt ?? null;

  const metadataRows: MetadataRow[] = [
    { label: photoPreviewStrings.metadata.info, value: displayName },
    { label: photoPreviewStrings.metadata.uploaded, value: formatDate(cloudItem.createdAt) },
    ...(cloudAsset?.fileSize
      ? [{ label: photoPreviewStrings.metadata.size, value: formatBytes(cloudAsset.fileSize) }]
      : []),
    {
      label: photoPreviewStrings.metadata.modified,
      value: modificationTimestamp ? formatDate(modificationTimestamp) : '-',
    },
    { label: photoPreviewStrings.metadata.dimensions, value: '-' },
    {
      label: photoPreviewStrings.metadata.format,
      value: cloudAsset?.extension ? cloudAsset.extension.toUpperCase() : formatExtension(cloudItem.fileName),
    },
  ];

  if (mountedRef.current) {
    setHeaderName(displayName);
    setHeaderSubtitle(formatCloudHeaderSubtitle(cloudAsset?.fileSize, cloudItem.createdAt));
    setRows(metadataRows);
  }
};

interface MetadataPanelProps {
  item: TimelinePhotoItem;
  onClose: () => void;
}

export const MetadataPanel = ({ item, onClose }: MetadataPanelProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<MetadataRow[]>([]);
  const [headerName, setHeaderName] = useState(item.type === 'cloud-only' ? item.fileName : '');
  const [headerSubtitle, setHeaderSubtitle] = useState(item.type === 'cloud-only' ? formatDate(item.createdAt) : '');
  const mountedRef = useRef(true);
  const thumbnailUri = item.type === 'local' ? (item.uri ?? null) : (item.thumbnailPath ?? null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (item.type === 'local') {
      buildLocalMetadata(item, mountedRef, setHeaderName, setHeaderSubtitle, setRows).catch(() => {
        if (mountedRef.current) setRows([]);
      });
    } else {
      buildCloudMetadata(item, mountedRef, setHeaderName, setHeaderSubtitle, setRows).catch(() => {
        if (mountedRef.current) setRows([]);
      });
    }
  }, [item.id]);

  const slideIn = useSharedValue(400);
  const dragY = useSharedValue(0);

  useEffect(() => {
    slideIn.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.quad) });
  }, []);

  const swipeGesture = Gesture.Pan()
    .activeOffsetY(10)
    .failOffsetX([-20, 20])
    .onUpdate((e) => {
      if (e.translationY > 0) {
        dragY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > 80) {
        runOnJS(onClose)();
      } else {
        dragY.value = withTiming(0, { duration: 150 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideIn.value + dragY.value }],
  }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        tailwind('absolute bg-white'),
        { bottom: 0, left: 0, right: 0, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '80%' },
      ]}
    >
      {/* Back row  */}
      <GestureDetector gesture={swipeGesture}>
        <View
          style={[
            tailwind('flex-row items-center px-4'),
            { height: ROW_HEIGHT, borderBottomWidth: 1, borderBottomColor: SEPARATOR_ROW },
          ]}
        >
          {/* Pull indicator pill */}
          <View style={[tailwind('absolute'), { top: 0, left: 0, right: 0, alignItems: 'center' }]}>
            <View style={[tailwind('bg-gray-20'), { width: 48, height: 4, borderRadius: 2, marginTop: 8 }]} />
          </View>

          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={tailwind('flex-row items-center')}
          >
            <CaretLeftIcon size={24} color={getColor('text-primary')} />
            <AppText medium style={tailwind('text-base text-primary')}>
              {photoPreviewStrings.back}
            </AppText>
          </TouchableOpacity>
        </View>
      </GestureDetector>

      {/* Photo info header */}
      <View
        style={[
          tailwind('flex-row items-center px-4'),
          { gap: 12, paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: SEPARATOR_SECTION },
        ]}
      >
        {thumbnailUri ? (
          <Image source={{ uri: thumbnailUri }} style={tailwind('w-12 h-12 rounded-lg')} resizeMode="cover" />
        ) : (
          <View style={tailwind('bg-gray-5 w-12 h-12 rounded-lg')} />
        )}
        <View style={tailwind('flex-1')}>
          {headerName ? (
            <AppText medium style={tailwind('text-base text-gray-100')} numberOfLines={1}>
              {headerName}
            </AppText>
          ) : null}
          {headerSubtitle ? (
            <AppText style={[tailwind('text-sm text-gray-60'), { marginTop: 2 }]} numberOfLines={1}>
              {headerSubtitle}
            </AppText>
          ) : null}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={tailwind('px-4 py-2')}>
          {rows.map((row, index) => (
            <Row key={row.label} label={row.label} value={row.value} isLast={index === rows.length - 1} />
          ))}
        </View>
      </ScrollView>

      <View style={{ height: insets.bottom + 24 }} />
    </Animated.View>
  );
};
