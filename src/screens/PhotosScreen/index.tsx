import { ImageIcon } from 'phosphor-react-native';
import { View } from 'react-native';
import AppScreen from 'src/components/AppScreen';
import AppScreenTitle from 'src/components/AppScreenTitle';
import AppText from 'src/components/AppText';
import useGetColor from 'src/hooks/useColor';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../assets/lang/strings';

const PhotosScreen = (): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  return (
    <AppScreen safeAreaTop style={tailwind('flex-1')}>
      <AppScreenTitle text={strings.screens.photos.title} showBackButton={false} />

      <View style={tailwind('flex-1 items-center justify-center px-10')}>
        <ImageIcon size={64} color={getColor('text-primary')} />
        <AppText medium style={[tailwind('text-xl mt-5 text-center'), { color: getColor('text-gray-100') }]}>
          {strings.screens.photos.emptyTitle}
        </AppText>
        <AppText style={[tailwind('text-base mt-1 text-center'), { color: getColor('text-gray-50') }]}>
          {strings.screens.photos.emptySubtitle}
        </AppText>
      </View>
    </AppScreen>
  );
};

export default PhotosScreen;
