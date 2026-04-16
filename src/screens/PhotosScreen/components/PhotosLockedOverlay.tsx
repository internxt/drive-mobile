import { ImageIcon, LockSimpleIcon } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';
import AppButton from 'src/components/AppButton';
import AppText from 'src/components/AppText';
import useGetColor from 'src/hooks/useColor';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../../assets/lang/strings';

interface PhotosLockedOverlayProps {
  onUpgradePress?: () => void;
}

const PhotosLockedOverlay = ({ onUpgradePress }: PhotosLockedOverlayProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  return (
    <View style={[StyleSheet.absoluteFillObject, styles.backdrop]}>
      <View style={[styles.card, { backgroundColor: getColor('bg-surface'), borderColor: getColor('border-gray-10') }]}>
        <View
          style={[styles.iconTile, { backgroundColor: getColor('bg-gray-1'), borderColor: getColor('border-gray-10') }]}
        >
          <ImageIcon size={40} color={getColor('text-primary')} weight="regular" />
          <View style={styles.lockBadge}>
            <LockSimpleIcon size={20} color={getColor('text-gray-60')} weight="fill" />
          </View>
        </View>

        <View style={tailwind('items-center gap-y-2 w-full')}>
          <AppText semibold style={[tailwind('text-xl text-center'), { color: getColor('text-gray-100') }]}>
            {strings.screens.photos.photosLocked.title}
          </AppText>
          <AppText style={[tailwind('text-sm text-center'), { color: getColor('text-gray-60') }]}>
            {strings.screens.photos.photosLocked.body}
          </AppText>
          <AppText style={[tailwind('text-sm text-center'), { color: getColor('text-gray-60') }]}>
            {strings.screens.photos.photosLocked.upgradeLine}
          </AppText>
        </View>

        <AppButton
          title={strings.screens.photos.photosLocked.upgradeCta}
          type="accept"
          onPress={onUpgradePress ?? (() => undefined)}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  iconTile: {
    width: 76,
    height: 76,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
  },
});

export default PhotosLockedOverlay;
