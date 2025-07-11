import React, { useEffect, useState } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import FastImage from 'react-native-fast-image';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../hooks/useColor';
import { useAppSelector } from '../../store/hooks';
import { authSelectors } from '../../store/slices/auth';
import AppText from '../AppText';

interface UserProfilePictureProps {
  uri: string | undefined | null;
  size: number;
  style?: StyleProp<ViewStyle>;
}

const UserProfilePicture = (props: UserProfilePictureProps) => {
  const tailwind = useTailwind();
  const nameLetters = useAppSelector(authSelectors.nameLetters);
  const getColor = useGetColor();
  const [imageError, setImageError] = useState(false);
  const hasValidAvatar = props.uri && !imageError;

  useEffect(() => {
    setImageError(false);
  }, [props.uri]);

  return (
    <View
      style={[
        tailwind('rounded-full overflow-hidden border '),
        { borderColor: getColor('bg-gray-5'), backgroundColor: getColor('bg-gray-10') },
        {
          height: props.size,
          width: props.size,
        },
        props.style,
      ]}
    >
      {hasValidAvatar ? (
        <FastImage
          source={{ uri: props.uri as string }}
          style={{
            height: props.size,
            width: props.size,
            borderRadius: props.size / 2,
          }}
          resizeMode={FastImage.resizeMode.cover}
          onError={() => {
            setImageError(true);
          }}
          onLoad={() => {
            setImageError(false);
          }}
        />
      ) : (
        <View
          style={{
            ...tailwind('items-center justify-center bg-primary/10'),
            height: props.size,
            width: props.size,
            borderRadius: props.size / 2,
          }}
        >
          <AppText
            medium
            style={{
              ...tailwind('text-center text-primary-dark'),
              fontSize: Math.floor(props.size * 0.45),
              lineHeight: props.size,
            }}
          >
            {nameLetters}
          </AppText>
        </View>
      )}
    </View>
  );
};

export default UserProfilePicture;
