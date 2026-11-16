import Portal from '@burstware/react-native-portal';
import asyncStorageService from '@internxt-mobile/services/AsyncStorageService';
import { biometrics, logger } from '@internxt-mobile/services/common';
import errorService from '@internxt-mobile/services/ErrorService';

import strings from 'assets/lang/strings';
import React, { useEffect, useState } from 'react';
import { Dimensions, TouchableOpacity, View } from 'react-native';
import AppText from 'src/components/AppText';
import BottomModal from 'src/components/modals/BottomModal';
import { useAppSelector } from 'src/store/hooks';
import LockIcon from '../../../../assets/images/screens/lock-icon.svg';
interface LockScreenProps {
  locked: boolean;
  lastScreenLock: number | null;
  onScreenUnlocked: () => void;
}
export const LockScreen: React.FC<LockScreenProps> = (props) => {
  const [unlockCancelled, setUnlockCancelled] = useState(false);
  const { biometricAccessType } = useAppSelector((state) => state.app);

  useEffect(() => {
    if (props.lastScreenLock && props.locked && !unlockCancelled) {
      initializeAuthentication();
    }
  }, [props.lastScreenLock]);

  const initializeAuthentication = async () => {
    try {
      const authenticationSuccess = await biometrics.authenticate();

      if (authenticationSuccess) {
        await asyncStorageService.saveLastScreenUnlock(new Date());
        setUnlockCancelled(false);
        props.onScreenUnlocked();
      } else {
        setUnlockCancelled(true);
      }
    } catch (error) {
      logger.info('initializeAuthentication on LockScreen failed or cancelled:', JSON.stringify(error));
      logger.info('initializeAuthentication on LockScreen failed, biometricAccessType=', biometricAccessType);
      errorService.reportError(error);
    }
  };

  if (!biometricAccessType) return <></>;
  return (
    <Portal>
      <BottomModal
        animationDuration={200}
        ignoreSafeAreaTop
        ignoreSafeAreaBottom
        className="rounded-none"
        style={{ height: Dimensions.get('window').height }}
        isOpen={props.locked}
        onClosed={() => {
          /** NOOP */
        }}
      >
        <View className="items-center justify-center h-full">
          <View className="">
            <LockIcon width={48} height={48} />
          </View>
          <AppText className="text-3xl mt-8" semibold>
            {strings.screens.LockScreen.title}
          </AppText>
          <AppText className="mt-2 text-gray-80">{strings.screens.LockScreen.message[biometricAccessType]}</AppText>
          <TouchableOpacity className="py-3 px-2 mt-8" onPress={initializeAuthentication}>
            <AppText className="text-lg text-primary" medium>
              {strings.screens.LockScreen.button[biometricAccessType]}
            </AppText>
          </TouchableOpacity>
        </View>
      </BottomModal>
    </Portal>
  );
};
