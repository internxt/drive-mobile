import { StyleSheet, View } from 'react-native';

import AppText from '../../../components/AppText';
import { applyOpacity } from '../../../helpers/colors';
import useGetColor from '../../../hooks/useColor';
import { getPaletteIndex, initialOf } from './avatarInitial';

const AVATAR_DIMENSIONS = {
  regular: { diameter: 40, fontSize: 15 },
  medium: { diameter: 32, fontSize: 13 },
  small: { diameter: 24, fontSize: 12 },
};

export const SENDER_AVATAR_SIZE = AVATAR_DIMENSIONS.regular.diameter;

const AVATAR_COLOR_KEYS = ['text-primary', 'text-green', 'text-orange', 'text-indigo', 'text-pink'];
const BACKGROUND_OPACITY = 0.15;

export const SenderAvatar = ({
  name,
  address,
  size = 'regular',
}: {
  name?: string;
  address: string;
  size?: keyof typeof AVATAR_DIMENSIONS;
}): JSX.Element => {
  const getColor = useGetColor();
  const color = getColor(AVATAR_COLOR_KEYS[getPaletteIndex(address, AVATAR_COLOR_KEYS.length)]);
  const { diameter, fontSize } = AVATAR_DIMENSIONS[size];

  return (
    <View
      style={[
        styles.circle,
        {
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          backgroundColor: applyOpacity(color, BACKGROUND_OPACITY),
        },
      ]}
    >
      <AppText semibold style={{ color, fontSize }}>
        {initialOf(name, address)}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
