import _ from 'lodash';
import { View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

interface StrengthMeterProps {
  value: number;
  maxValue: number;
}

const StrengthMeter = (props: StrengthMeterProps) => {
  const tailwind = useTailwind();
  const renderItems = () =>
    _.times(props.maxValue, (n) => (
      <View
        key={n.toString()}
        style={[tailwind('h-1 w-10 bg-gray-10 mr-1.5 rounded-full'), props.value > n && tailwind('bg-red-')]}
      />
    ));

  return <View style={tailwind('flex-row')}>{renderItems()}</View>;
};

export default StrengthMeter;
