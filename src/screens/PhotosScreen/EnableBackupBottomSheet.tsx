import { ClockCounterClockwiseIcon, DesktopTowerIcon, LockSimpleIcon, XIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { Image, Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import AppButton from 'src/components/AppButton';
import AppText from 'src/components/AppText';
import BottomModal from 'src/components/modals/BottomModal';
import useGetColor from 'src/hooks/useColor';
import { logger } from 'src/services/common';
import { useAppDispatch } from 'src/store/hooks';
import { enableBackupThunk } from 'src/store/slices/photos';
import strings from '../../../assets/lang/strings';

import discoverPhotosImg from 'assets/images/discover_photos.png';

interface EnableBackupBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type SheetStatus = 'idle' | 'loading' | 'denied';

const EnableBackupBottomSheet = ({ isOpen, onClose, onSuccess }: EnableBackupBottomSheetProps): JSX.Element => {
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
    try {
      const result = await dispatch(enableBackupThunk()).unwrap();
      if (result.isGranted) {
        handleClose();
        onSuccess?.();
      } else {
        setStatus('denied');
      }
    } catch (error) {
      logger.error('[EnableBackupBottomSheet] enableBackupThunk rejected', { error });
      setStatus('idle');
    }
  };

  return (
    <BottomModal isOpen={isOpen} onClosed={handleClose} topDecoration={false} backdropPressToClose>
      <ScrollView
        contentContainerClassName="px-5 pb-6"
        contentContainerStyle={styles.contentContainer}
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
          <Image source={discoverPhotosImg} style={styles.illustrationImage} resizeMode="cover" />
        </View>

        <AppText
          semibold
          className="text-center mt-6"
          style={{ fontSize: 30, lineHeight: 36, color: getColor('text-gray-100') }}
        >
          {enableSheetStrings.title}
        </AppText>

        <View className="mt-6" style={{ gap: 12 }}>
          {featureRows.map(({ id, Icon, text }) => (
            <View key={id} className="flex-row items-start">
              <View style={[styles.iconBox, { backgroundColor: getColor('bg-primary-10') }]}>
                <Icon size={20} color={getColor('text-primary')} weight="light" />
              </View>
              <AppText className="flex-1 ml-3 text-base" style={{ color: getColor('text-gray-80'), lineHeight: 22 }}>
                {text}
              </AppText>
            </View>
          ))}
        </View>

        {status === 'denied' && (
          <View style={[styles.hintBox, { backgroundColor: getColor('bg-primary-10') }]}>
            <AppText className="text-sm" style={{ color: getColor('text-primary-dark'), lineHeight: 20 }}>
              {enableSheetStrings.deniedHintPrefix}
              <AppText semibold className="text-sm" style={{ color: getColor('text-primary-dark') }}>
                {enableSheetStrings.deniedHintNone}
              </AppText>
              {enableSheetStrings.deniedHintMiddle}
              <AppText semibold className="text-sm" style={{ color: getColor('text-primary-dark') }}>
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
          className="mt-6"
        />

        <AppText className="text-center mt-4" style={{ fontSize: 12, lineHeight: 17, color: getColor('text-gray-40') }}>
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
    marginTop: 8,
  },
  illustrationImage: {
    width: '100%',
    height: 200,
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
