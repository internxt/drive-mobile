import { CaretLeftIcon } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
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
import { TimelinePhotoItem } from '../../PhotosScreen/types';
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
    const buildRows = async () => {
      if (item.type === 'local') {
        try {
          const cached = await photosLocalDB.getStatus(item.id);
          let fileName = cached?.fileName ?? null;
          let creationTime = cached?.creationTime ?? null;
          let width = cached?.width ?? null;
          let height = cached?.height ?? null;
          let fileSize = cached?.fileSize ?? null;

          const info = await photoMediaLibraryService.getAssetInfo(item.id);
          fileName ??= info.filename;
          creationTime ??= info.creationTime;
          const modificationTime: number | null = info.modificationTime ?? null;
          width ??= info.width;
          height ??= info.height;

          if (!fileSize && info.localUri) {
            try {
              const stat = await fileSystemService.stat(stripFileUri(info.localUri));
              fileSize = stat.size;
              photosLocalDB.cacheAssetFileSize(item.id, fileSize).catch(() => undefined);
            } catch (error) {
              console.error('Failed to get file size for', info.localUri, error);
            }
          }

          const built: MetadataRow[] = [
            { label: photoPreviewStrings.metadata.info, value: fileName ?? '-' },
            { label: photoPreviewStrings.metadata.uploaded, value: creationTime ? formatDate(creationTime) : '-' },
            ...(fileSize ? [{ label: photoPreviewStrings.metadata.size, value: formatBytes(fileSize) }] : []),
            {
              label: photoPreviewStrings.metadata.modified,
              value: modificationTime ? formatDate(modificationTime) : '-',
            },
            {
              label: photoPreviewStrings.metadata.dimensions,
              value: width && height ? formatDimensions(width, height) : '-',
            },
            { label: photoPreviewStrings.metadata.format, value: fileName ? formatExtension(fileName) : '-' },
          ];
          if (mountedRef.current) {
            setHeaderName(fileName ?? '');
            setHeaderSubtitle(
              fileSize && creationTime
                ? `${formatBytes(fileSize)} · ${formatDate(creationTime)}`
                : creationTime
                  ? formatDate(creationTime)
                  : '',
            );
            setRows(built);
          }
        } catch {
          if (mountedRef.current) setRows([]);
        }
      } else {
        const asset = await photosLocalDB.getCloudAssetById(item.id);
        const displayName = asset?.plainName
          ? `${asset.plainName}${asset.extension ? `.${asset.extension}` : ''}`
          : item.fileName;
        const modTime = asset?.modificationTime ?? asset?.updatedAt ?? null;
        const built: MetadataRow[] = [
          { label: photoPreviewStrings.metadata.info, value: displayName },
          { label: photoPreviewStrings.metadata.uploaded, value: formatDate(item.createdAt) },
          ...(asset?.fileSize
            ? [{ label: photoPreviewStrings.metadata.size, value: formatBytes(asset.fileSize) }]
            : []),
          { label: photoPreviewStrings.metadata.modified, value: modTime ? formatDate(modTime) : '-' },
          { label: photoPreviewStrings.metadata.dimensions, value: '-' },
          {
            label: photoPreviewStrings.metadata.format,
            value: asset?.extension ? asset.extension.toUpperCase() : formatExtension(item.fileName),
          },
        ];
        if (mountedRef.current) {
          setHeaderName(asset?.plainName ?? item.fileName);
          setHeaderSubtitle(
            asset?.fileSize
              ? `${formatBytes(asset.fileSize)} · ${formatDate(item.createdAt)}`
              : formatDate(item.createdAt),
          );
          setRows(built);
        }
      }
    };
    buildRows();
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
