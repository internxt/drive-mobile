import _ from 'lodash';
import { useMemo } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import useGetColor from '../../hooks/useColor';
import AppText from '../AppText';
import { cssInterop } from 'nativewind';

interface StrengthMeterProps {
  style?: StyleProp<ViewStyle>;
  className?: string;
  value: number;
  maxValue: number;
  message: string;
}

const StrengthMeter = ({ style, value, maxValue, message }: StrengthMeterProps) => {
  const getColor = useGetColor();
  const color = useMemo(() => {
    let color = getColor('text-red');

    if (value === maxValue) {
      color = getColor('text-green');
    } else if (value >= Math.ceil(maxValue * 0.5)) {
      color = getColor('text-orange');
    }

    return color;
  }, [value, maxValue]);
  const renderItems = () => {
    return _.times(maxValue, (n) => (
      <View
        key={n.toString()}
        className="h-1 w-10 bg-gray-10 mr-1.5 rounded-full"
        style={value > n && { backgroundColor: color }}
      />
    ));
  };

  return (
    <View style={style}>
      <View className="flex-row">{renderItems()}</View>
      <AppText className="mt-1.5 text-sm" style={{ color }} medium>
        {message}
      </AppText>
    </View>
  );
};

cssInterop(StrengthMeter, { className: 'style' });

export default StrengthMeter;
