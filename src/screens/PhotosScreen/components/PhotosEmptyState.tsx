import { ImageIcon } from 'phosphor-react-native';
import { View } from 'react-native';
import AppText from 'src/components/AppText';
import useGetColor from 'src/hooks/useColor';
import { useLanguage } from 'src/hooks/useLanguage';
import strings from '../../../../assets/lang/strings';

const PhotosEmptyState = () => {
  const getColor = useGetColor();
  useLanguage();

  return (
    <View className="flex-1 items-center justify-center">
      <ImageIcon size={64} color={getColor('text-primary')} />
      <View className="items-center mt-5">
        <AppText medium className="text-xl text-center text-gray-100">
          {strings.screens.photos.emptyTitle}
        </AppText>
        <AppText className="text-base text-center text-gray-50">{strings.screens.photos.emptySubtitle}</AppText>
      </View>
    </View>
  );
};

export default PhotosEmptyState;
