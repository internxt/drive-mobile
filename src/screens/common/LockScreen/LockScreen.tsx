import Portal from '@burstware/react-native-portal';
import asyncStorageService from '@internxt-mobile/services/AsyncStorageService';
import { biometrics } from '@internxt-mobile/services/common';
import errorService from '@internxt-mobile/services/ErrorService';

import strings from 'assets/lang/strings';
import React, { useEffect, useState } from 'react';
import { Dimensions, TouchableOpacity, View } from 'react-native';
import AppText from 'src/components/AppText';
import BottomModal from 'src/components/modals/BottomModal';
import { useAppSelector } from 'src/store/hooks';
import { useTailwind } from 'tailwind-rn';
import LockIcon from '../../../../assets/images/screens/lock-icon.svg';
interface LockScreenProps {
  locked: boolean;
  lastScreenLock: number | null;
  onScreenUnlocked: () => void;
}
export const LockScreen: React.FC<LockScreenProps> = (props) => {
  const tailwind = useTailwind();
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
        style={[tailwind('rounded-none'), { height: Dimensions.get('window').height }]}
        isOpen={props.locked}
        onClosed={() => {
          /** NOOP */
        }}
      >
        <View style={tailwind('items-center justify-center h-full')}>
          <View style={tailwind('')}>
            <LockIcon width={48} height={48} />
          </View>
          <AppText style={tailwind('text-3xl mt-8')} semibold>
            {strings.screens.LockScreen.title}
          </AppText>
          <AppText style={tailwind('mt-2 text-gray-80')}>
            {strings.screens.LockScreen.message[biometricAccessType]}
          </AppText>
          <TouchableOpacity style={tailwind('py-3 px-2 mt-8')} onPress={initializeAuthentication}>
            <AppText style={tailwind('text-lg text-primary')} medium>
              {strings.screens.LockScreen.button[biometricAccessType]}
            </AppText>
          </TouchableOpacity>
        </View>
      </BottomModal>
    </Portal>
  );
};
