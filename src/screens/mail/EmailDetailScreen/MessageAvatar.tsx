import { View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import AppText from '../../../components/AppText';
import useGetColor from '../../../hooks/useColor';
import { initialOf } from '../components/avatarInitial';

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
