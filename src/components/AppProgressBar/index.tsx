import { StyleProp, View, ViewStyle } from 'react-native';
import { Bar as ProgressBar } from 'react-native-progress';
import { useTailwind } from 'tailwind-rn';
interface AppProgressBarProps {
  currentValue: number;
  totalValue: number;
  style?: StyleProp<ViewStyle>;
  progressStyle?: StyleProp<ViewStyle>;
  animateWidth?: boolean;
  height?: number;
  borderRadius?: number;
}

export default function AppProgressBar(props: AppProgressBarProps): JSX.Element {
  const tailwind = useTailwind();

  return (
    <View style={[tailwind('bg-gray-5 rounded'), props.style]}>
      <ProgressBar
        borderRadius={props.borderRadius || 10}
        width={null}
        animated
        height={props.height || 4}
        borderWidth={0}
        color={tailwind('text-primary').color as string}
        progress={(props.currentValue * 100) / props.totalValue / 100}
      />
    </View>
  );
}
