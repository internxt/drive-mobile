import { StyleSheet, View } from 'react-native';

import AppText from '../../../components/AppText';
import useGetColor from '../../../hooks/useColor';
import { initialOf, getPaletteIndex } from './avatarInitial';

export const SENDER_AVATAR_SIZE = 40;

const AVATAR_COLOR_KEYS = ['text-primary', 'text-green', 'text-orange', 'text-indigo', 'text-pink'];
const BACKGROUND_OPACITY = 0.15;
const INITIAL_FONT_SIZE = 15;

const applyOpacity = (rgbColor: string, opacity: number) =>
  rgbColor.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`);

export const SenderAvatar = ({ name, address }: { name?: string; address: string }): JSX.Element => {
  const getColor = useGetColor();
  const color = getColor(AVATAR_COLOR_KEYS[getPaletteIndex(address, AVATAR_COLOR_KEYS.length)]);

  return (
    <View style={[styles.circle, { backgroundColor: applyOpacity(color, BACKGROUND_OPACITY) }]}>
      <AppText semibold style={{ color, fontSize: INITIAL_FONT_SIZE }}>
        {initialOf(name, address)}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  circle: {
    width: SENDER_AVATAR_SIZE,
    height: SENDER_AVATAR_SIZE,
    borderRadius: SENDER_AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
