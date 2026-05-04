import { Image, StyleSheet, View } from 'react-native';
import AppButton from 'src/components/AppButton';
import AppText from 'src/components/AppText';
import BottomModal from 'src/components/modals/BottomModal';
import useGetColor from 'src/hooks/useColor';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../assets/lang/strings';

import illustrationImg from '../../../assets/images/photos-discover-illustration.png';
import tabbarImg from '../../../assets/images/photos-discover-tabbar.png';

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

  return (
    <BottomModal isOpen={isOpen} onClosed={onDismiss} topDecoration backdropPressToClose ignoreSafeAreaTop>
      <View style={tailwind('pb-6')}>
        <View style={styles.illustrationContainer}>
          <Image source={illustrationImg} style={styles.illustration} resizeMode="cover" />
          <View style={[styles.illustrationFade, { backgroundColor: getColor('bg-white') }]} />
          <Image source={tabbarImg} style={styles.tabbar} resizeMode="contain" />
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
  illustrationContainer: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: 32,
  },
  illustration: {
    position: 'absolute',
    top: 0,
    width: 288,
    height: 580,
  },
  illustrationFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    opacity: 0.95,
  },
  tabbar: {
    width: 288,
    height: 40,
  },
});

export default DiscoverPhotosBottomSheet;
