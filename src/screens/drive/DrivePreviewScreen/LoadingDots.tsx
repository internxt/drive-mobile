import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import AppText from 'src/components/AppText';

interface AnimatedLoadingDotsProps {
  previousDotsText?: string;
  progress?: number;
}

const AnimatedLoadingDots: React.FC<AnimatedLoadingDotsProps> = ({ previousDotsText, progress }) => {
  const [dots, setDots] = useState('.');

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
    <View className="flex-row items-center justify-center">
      <AppText className="text-gray-60 text-center">{`${previousDotsText ?? ''}${dots}${
        progress !== undefined ? ` ${progress}%` : ''
      }`}</AppText>
    </View>
  );
};

export default AnimatedLoadingDots;
