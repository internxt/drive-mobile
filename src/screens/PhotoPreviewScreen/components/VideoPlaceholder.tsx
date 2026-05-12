import { PlayCircle } from 'phosphor-react-native';
import { Image, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import { useCloudThumbnail } from '../../PhotosScreen/hooks/useCloudThumbnail';
import { TimelinePhotoItem } from '../../PhotosScreen/types';

interface VideoPlaceholderProps {
  item: TimelinePhotoItem;
}

const VideoThumbnailContent = ({ uri }: { uri: string | null | undefined }) => {
  const tailwind = useTailwind();
  return (
    <View style={tailwind('flex-1 bg-black justify-center items-center')}>
      {uri ? <Image source={{ uri }} style={tailwind('w-full h-full')} resizeMode="contain" /> : null}
      <View style={tailwind('absolute')}>
        <PlayCircle size={64} color="white" weight="fill" />
      </View>
    </View>
  );
};

const CloudVideoThumbnail = ({ item }: { item: Extract<TimelinePhotoItem, { type: 'cloud-only' }> }) => {
  const { uri } = useCloudThumbnail(item);
  return <VideoThumbnailContent uri={uri} />;
};

export const VideoPlaceholder = ({ item }: VideoPlaceholderProps): JSX.Element => {
  if (item.type === 'cloud-only') {
    return <CloudVideoThumbnail item={item} />;
  }
  return <VideoThumbnailContent uri={item.uri} />;
};
