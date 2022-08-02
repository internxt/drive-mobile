import { StyleProp, View, ViewStyle } from 'react-native';
import { useTailwind } from 'tailwind-rn';

interface StorageUsageBarProps {
  style?: StyleProp<ViewStyle>;
}

const StorageUsageBar = (props: StorageUsageBarProps) => {
  const tailwind = useTailwind();

  return <View style={[tailwind('rounded-2xl bg-gray-40 h-3'), props.style]}></View>;
};

export default StorageUsageBar;
