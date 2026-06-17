import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, View } from 'react-native';
import AppButton from 'src/components/AppButton';
import AppText from 'src/components/AppText';
import BottomModal from 'src/components/modals/BottomModal';
import useGetColor from 'src/hooks/useColor';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../assets/lang/strings';

import illustrationImg from '../../../assets/images/photos-discover-illustration.png';

interface DiscoverPhotosBottomSheetProps {
  isOpen: boolean;
  onDismiss: () => void;
  onStartPhotos: () => void;
}

const DiscoverPhotosBottomSheet = ({
  isOpen,
  onDismiss,
  onStartPhotos,
}: DiscoverPhotosBottomSheetProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const discoverSheetStrings = strings.screens.photos.discoverSheet;
  const surfaceColor = getColor('bg-surface');
  const surfaceColorTransparent = surfaceColor.replace('rgb(', 'rgba(').replace(')', ', 0)');

  return (
    <BottomModal isOpen={isOpen} onClosed={onDismiss} topDecoration backdropPressToClose ignoreSafeAreaTop>
      <View style={tailwind('pb-6')}>
        <View style={styles.illustrationWrapper}>
          <View style={styles.illustrationContainer}>
            <Image source={illustrationImg} style={styles.illustration} resizeMode="cover" />
            <LinearGradient colors={[surfaceColor, surfaceColorTransparent]} style={styles.illustrationFade} />
          </View>
        </View>

        <View style={[tailwind('px-6'), { gap: 32 }]}>
          <View style={{ gap: 8 }}>
            <AppText
              semibold
              style={[tailwind('text-center'), { fontSize: 20, lineHeight: 24, color: getColor('text-gray-100') }]}
            >
              {discoverSheetStrings.title}
            </AppText>
            <AppText style={[tailwind('text-center text-base'), { color: getColor('text-gray-80'), lineHeight: 22 }]}>
              {discoverSheetStrings.subtitle}
            </AppText>
          </View>

          <AppButton title={discoverSheetStrings.startButton} type="accept" onPress={onStartPhotos} />
        </View>
      </View>
    </BottomModal>
  );
};

const styles = StyleSheet.create({
  illustrationWrapper: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 24,
    marginBottom: 32,
  },
  illustrationContainer: {
    height: 128,
    width: 288,
    overflow: 'hidden',
  },
  illustration: {
    position: 'absolute',
    width: 288,
    height: 585,
    top: -457,
  },
  illustrationFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 57,
  },
});

export default DiscoverPhotosBottomSheet;
