import { ClockCounterClockwiseIcon, DesktopTowerIcon, LockSimpleIcon, XIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { Image, Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import AppButton from 'src/components/AppButton';
import AppText from 'src/components/AppText';
import BottomModal from 'src/components/modals/BottomModal';
import useGetColor from 'src/hooks/useColor';
import { useAppDispatch } from 'src/store/hooks';
import { enableBackupThunk } from 'src/store/slices/photos';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../assets/lang/strings';

import photoCenter from '../../../assets/images/photos-sheet-center.jpg';
import photoLeft from '../../../assets/images/photos-sheet-left.jpg';
import photoRight from '../../../assets/images/photos-sheet-right.jpg';

interface EnableBackupBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type SheetStatus = 'idle' | 'loading' | 'denied';

const EnableBackupBottomSheet = ({ isOpen, onClose, onSuccess }: EnableBackupBottomSheetProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState<SheetStatus>('idle');

  const enableSheetStrings = strings.screens.photos.enableSheet;
  const featureRows = [
    { id: 'privacy', Icon: LockSimpleIcon, text: enableSheetStrings.featurePrivacy },
    { id: 'devices', Icon: DesktopTowerIcon, text: enableSheetStrings.featureDevices },
    { id: 'backup', Icon: ClockCounterClockwiseIcon, text: enableSheetStrings.featureBackup },
  ];

  const handleClose = () => {
    setStatus('idle');
    onClose();
  };

  const handleAllowPress = async () => {
    if (status === 'denied') {
      await Linking.openSettings();
      return;
    }
    setStatus('loading');
    const result = await dispatch(enableBackupThunk()).unwrap();
    if (result.isGranted) {
      handleClose();
      onSuccess?.();
    } else {
      setStatus('denied');
    }
  };

  return (
    <BottomModal isOpen={isOpen} onClosed={handleClose} topDecoration={false} backdropPressToClose ignoreSafeAreaTop>
      <ScrollView
        contentContainerStyle={[tailwind('px-5 pb-6'), styles.contentContainer]}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={handleClose}
          style={[styles.closeButton, { backgroundColor: getColor('bg-gray-5') }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <XIcon size={16} color={getColor('text-gray-60')} weight="bold" />
        </TouchableOpacity>

        <View style={styles.illustrationContainer}>
          <Image
            source={photoLeft}
            style={[styles.photoTile, styles.photoTileSide, { transform: [{ rotate: '-8deg' }, { translateX: -50 }] }]}
          />
          <Image
            source={photoRight}
            style={[
              styles.photoTile,
              styles.photoTileSide,
              { zIndex: 10, transform: [{ rotate: '8deg' }, { translateX: 50 }] },
            ]}
          />
          <Image source={photoCenter} style={[styles.photoTile, styles.photoTileCenter]} />
        </View>

        <AppText
          semibold
          style={[tailwind('text-center mt-6'), { fontSize: 30, lineHeight: 36, color: getColor('text-gray-100') }]}
        >
          {enableSheetStrings.title}
        </AppText>

        <View style={[tailwind('mt-6'), { gap: 12 }]}>
          {featureRows.map(({ id, Icon, text }) => (
            <View key={id} style={tailwind('flex-row items-start')}>
              <View style={[styles.iconBox, { backgroundColor: getColor('bg-primary-10') }]}>
                <Icon size={20} color={getColor('text-primary')} weight="light" />
              </View>
              <AppText style={[tailwind('flex-1 ml-3 text-base'), { color: getColor('text-gray-80'), lineHeight: 22 }]}>
                {text}
              </AppText>
            </View>
          ))}
        </View>

        {status === 'denied' && (
          <View style={[styles.hintBox, { backgroundColor: getColor('bg-primary-10') }]}>
            <AppText style={[tailwind('text-sm'), { color: getColor('text-primary-dark'), lineHeight: 20 }]}>
              {enableSheetStrings.deniedHintPrefix}
              <AppText semibold style={[tailwind('text-sm'), { color: getColor('text-primary-dark') }]}>
                {enableSheetStrings.deniedHintNone}
              </AppText>
              {enableSheetStrings.deniedHintMiddle}
              <AppText semibold style={[tailwind('text-sm'), { color: getColor('text-primary-dark') }]}>
                {enableSheetStrings.deniedHintAllPhotos}
              </AppText>
              {'.'}
            </AppText>
          </View>
        )}

        <AppButton
          title={enableSheetStrings.allowButton}
          type="accept"
          loading={status === 'loading'}
          onPress={handleAllowPress}
          style={tailwind('mt-6')}
        />

        <AppText
          style={[tailwind('text-center mt-4'), { fontSize: 12, lineHeight: 17, color: getColor('text-gray-40') }]}
        >
          {enableSheetStrings.disclaimer}
        </AppText>
      </ScrollView>
    </BottomModal>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    paddingTop: 48,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationContainer: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  photoTile: {
    width: 112,
    height: 112,
    borderRadius: 12,
    position: 'absolute',
  },
  photoTileCenter: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 2,
  },
  photoTileSide: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  hintBox: {
    marginTop: 16,
    borderRadius: 12,
    padding: 12,
  },
});

export default EnableBackupBottomSheet;
