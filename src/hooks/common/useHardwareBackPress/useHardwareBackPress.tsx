import { useEffect } from 'react';
import { BackHandler } from 'react-native';

export const useHardwareBackPress = (handleBackAction: () => void) => {
  useEffect(() => {
    function handler() {
      handleBackAction();
      return true;
    }
    BackHandler.addEventListener('hardwareBackPress', handler);

    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handler);
    };
  }, []);
};
