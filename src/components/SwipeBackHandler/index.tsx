import { useEffect } from 'react';
import { BackHandler } from 'react-native';

interface SwipeBackProps {
  swipeBack: () => void;
}

const SwipeBackHandler = ({ swipeBack }: SwipeBackProps) => {
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    return () => backHandler.remove();
  }, []);

  const handleBackPress = () => {
    swipeBack();
    return true;
  };

  return null;
};

export default SwipeBackHandler;
