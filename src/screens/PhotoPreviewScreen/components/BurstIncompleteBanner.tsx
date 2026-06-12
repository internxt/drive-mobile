import strings from 'assets/lang/strings';
import { WarningIcon } from 'phosphor-react-native';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from 'src/components/AppText';
import { useTailwind } from 'tailwind-rn';

interface Props {
  visible: boolean;
}

export const BurstIncompleteBanner = ({ visible }: Props): JSX.Element => {
  const tailwind = useTailwind();
  const insets = useSafeAreaInsets();

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(visible ? 1 : 0, { duration: 150, easing: Easing.out(Easing.quad) }),
  }));

  const bottomOffset = 160 + insets.bottom;

  return (
    <Animated.View
      pointerEvents="none"
      style={[animatedStyle, { position: 'absolute', bottom: bottomOffset, left: 16, right: 16 }]}
    >
      <View
        style={[
          tailwind('flex-row items-center rounded-xl px-3 py-2'),
          { backgroundColor: 'rgba(0,0,0,0.65)', gap: 8 },
        ]}
      >
        <WarningIcon size={18} color="#F59E0B" weight="fill" />
        <AppText style={tailwind('text-white text-supporting-2 flex-1')}>
          {strings.screens.photos.photoPreview.burstIncomplete}
        </AppText>
      </View>
    </Animated.View>
  );
};
