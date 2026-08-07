import { ImageIcon } from 'phosphor-react-native';
import { View } from 'react-native';
import AppText from 'src/components/AppText';
import useGetColor from 'src/hooks/useColor';
import { useLanguage } from 'src/hooks/useLanguage';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../../assets/lang/strings';

const PhotosEmptyState = () => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  useLanguage();

  return (
    <View style={[tailwind('flex-1 items-center justify-center ')]}>
      <ImageIcon size={64} color={getColor('text-primary')} />
      <View style={[tailwind('items-center mt-5')]}>
        <AppText medium style={tailwind('text-xl text-center text-gray-100')}>
          {strings.screens.photos.emptyTitle}
        </AppText>
        <AppText style={tailwind('text-base text-center text-gray-50')}>{strings.screens.photos.emptySubtitle}</AppText>
      </View>
    </View>
  );
};

export default PhotosEmptyState;
