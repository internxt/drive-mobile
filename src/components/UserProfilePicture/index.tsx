import React from 'react';
import { StyleProp, View, ViewStyle, Image } from 'react-native';
import FastImage from 'react-native-fast-image';
import { useTailwind } from 'tailwind-rn';
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
  const hasAvatar = props.uri;
  const nameLetters = useAppSelector(authSelectors.nameLetters);

  return (
    <View
      style={[
        tailwind('bg-gray-10 border border-black/5 rounded-full'),
        { height: props.size, width: props.size },
        props.style,
      ]}
    >
      {hasAvatar ? (
        <FastImage
          source={{ uri: props.uri as string }}
          style={{ ...tailwind('rounded-full'), height: props.size, width: props.size }}
        />
      ) : (
        <View
          style={{
            ...tailwind('items-center justify-center rounded-full bg-primary/10'),
            height: props.size,
            width: props.size,
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
