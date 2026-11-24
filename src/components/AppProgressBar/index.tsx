import { StyleProp, View, ViewStyle } from 'react-native';
import { Bar as ProgressBar } from 'react-native-progress';
import { cssInterop } from 'nativewind';
import useGetColor from 'src/hooks/useColor';
interface AppProgressBarProps {
  currentValue: number;
  totalValue: number;
  style?: StyleProp<ViewStyle>;
  className?: string;
  progressStyle?: StyleProp<ViewStyle>;
  progressClassName?: string;
  animateWidth?: boolean;
  height?: number;
  borderRadius?: number;
}

export default function AppProgressBar(props: AppProgressBarProps): JSX.Element {
  const getColor = useGetColor();

  return (
    <View className="bg-gray-5 rounded" style={props.style}>
      <ProgressBar
        borderRadius={props.borderRadius || 10}
        width={null}
        animated
        height={props.height || 4}
        borderWidth={0}
        color={getColor('text-primary')}
        progress={(props.currentValue * 100) / props.totalValue / 100}
      />
    </View>
  );
}

cssInterop(AppProgressBar, { className: 'style', progressClassName: 'progressStyle' });
