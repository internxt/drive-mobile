import _ from 'lodash';
import { useMemo } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../hooks/useColor';
import AppText from '../AppText';

interface StrengthMeterProps {
  style?: StyleProp<ViewStyle>;
  value: number;
  maxValue: number;
  message: string;
}

const StrengthMeter = ({ style, value, maxValue, message }: StrengthMeterProps) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const color = useMemo(() => {
    let color = getColor('text-red');

    if (value === maxValue) {
      color = getColor('text-green-');
    } else if (value >= Math.ceil(maxValue * 0.5)) {
      color = getColor('text-orange-');
    }

    return color;
  }, [value, maxValue]);
  const renderItems = () => {
    return _.times(maxValue, (n) => (
      <View
        key={n.toString()}
        style={[tailwind('h-1 w-10 bg-gray-10 mr-1.5 rounded-full'), value > n && { backgroundColor: color }]}
      />
    ));
  };

  return (
    <View style={style}>
      <View style={tailwind('flex-row')}>{renderItems()}</View>
      <AppText style={[tailwind('mt-1.5 text-sm'), { color }]} medium>
        {message}
      </AppText>
    </View>
  );
};

export default StrengthMeter;
