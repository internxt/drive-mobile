import { useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';

export const useHardwareBackPress = (handleBackAction: () => void) => {
  const handleBackActionRef = useRef(handleBackAction);
  handleBackActionRef.current = handleBackAction;

  useEffect(() => {
    const handler = () => {
      handleBackActionRef.current();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', handler);

    return () => {
      subscription.remove();
    };
  }, []);
};
