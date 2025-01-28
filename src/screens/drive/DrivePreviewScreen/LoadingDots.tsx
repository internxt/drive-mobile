import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import AppText from 'src/components/AppText';
import { useTailwind } from 'tailwind-rn';

interface AnimatedLoadingDotsProps {
  previousDotsText?: string;
  progress?: number;
}

const AnimatedLoadingDots: React.FC<AnimatedLoadingDotsProps> = ({ previousDotsText, progress }) => {
  const [dots, setDots] = useState('.');
  const tailwind = useTailwind();

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prevDots) => {
        switch (prevDots) {
          case '.  ':
            return '.. ';
          case '.. ':
            return '...';
          default:
            return '.  ';
        }
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={tailwind('flex-row items-center justify-center')}>
      <AppText style={tailwind('text-gray-60 text-center')}>{`${previousDotsText ?? ''}${dots}${
        progress !== undefined ? ` ${progress}%` : ''
      }`}</AppText>
    </View>
  );
};

export default AnimatedLoadingDots;
