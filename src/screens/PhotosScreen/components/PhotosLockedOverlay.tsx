import { ImageIcon } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';
import AppText from 'src/components/AppText';
import useGetColor from 'src/hooks/useColor';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../../assets/lang/strings';
import LockBadgeIcon from './LockBadgeIcon';

const PhotosLockedOverlay = (): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  return (
    <View style={[StyleSheet.absoluteFillObject, styles.backdrop]}>
      <View style={[styles.card, { backgroundColor: getColor('bg-surface'), borderColor: getColor('border-gray-10') }]}>
        <View
          style={[styles.iconTile, { backgroundColor: getColor('bg-gray-1'), borderColor: getColor('border-gray-10') }]}
        >
          <ImageIcon size={64} color={getColor('text-primary')} weight="regular" />
          <View style={styles.lockBadge}>
            <LockBadgeIcon size={32} />
          </View>
        </View>

        <View style={[tailwind('items-center w-full'), styles.textStack]}>
          <AppText semibold style={[tailwind('text-xl text-center'), { color: getColor('text-gray-100') }]}>
            {strings.screens.photos.photosLocked.title}
          </AppText>
          <AppText style={[tailwind('text-sm text-center'), { color: getColor('text-gray-60') }]}>
            {strings.screens.photos.photosLocked.body}
          </AppText>
          <AppText style={[tailwind('text-sm text-center'), { color: getColor('text-gray-60') }]}>
            {strings.screens.photos.photosLocked.upgradeLine}
          </AppText>
          <AppText style={[tailwind('text-sm text-center'), { color: getColor('text-gray-60') }]}>
            {strings.screens.photos.photosLocked.upgradeInfoPrefix}
            <AppText semibold style={{ color: getColor('text-gray-60') }}>
              {strings.screens.photos.photosLocked.upgradeInfoHighlight}
            </AppText>
          </AppText>
        </View>
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
    gap: 16,
  },
  textStack: {
    gap: 8,
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
    bottom: -16,
    left: -16,
  },
});

export default PhotosLockedOverlay;
