import { View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import AppText from '../../../components/AppText';
import useGetColor from '../../../hooks/useColor';

/**
 * Reads the letter that stands for someone in an avatar: the first one of their display name, and
 * the first one of their address when there is no name.
 *
 * @param name - Display name, when there is one.
 * @param address - Address the letter falls back to.
 * @returns A single uppercase letter, or `?` when neither holds one.
 */
export const initialOf = (name: string | undefined, address: string): string => {
  const source = name?.trim() || address.trim();
  const letter = [...source].find((character) => /\p{L}|\p{N}/u.test(character));

  return letter ? letter.toUpperCase() : '?';
};

export const MessageAvatar = ({ name, address, size }: { name?: string; address: string; size: number }) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  return (
    <View
      style={[
        tailwind('items-center justify-center bg-primary/10'),
        { height: size, width: size, borderRadius: size / 4 },
      ]}
    >
      <AppText medium style={[tailwind('text-base'), { color: getColor('text-primary') }]}>
        {initialOf(name, address)}
      </AppText>
    </View>
  );
};
