import { useState } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import strings from '../../../assets/lang/strings';
import useGetColor from '../../hooks/useColor';
import AppText from '../AppText';

interface DebugInternetWidgetProps {
  style?: StyleProp<ViewStyle>;
}

const DebugInternetWidget = (props: DebugInternetWidgetProps): JSX.Element => {
  const getColor = useGetColor();
  const [speed] = useState(0);
  const bySpeedFeatures = [
    { min: 20, color: getColor('text-green') },
    { min: 10, color: getColor('text-yellow-dark') },
    { min: 0, color: getColor('text-red-dark') },
  ];
  const getSpeedColor = () => {
    let color = bySpeedFeatures[0].color;

    bySpeedFeatures.every((f) => {
      const speedGreaterThanMin = speed >= f.min;

      if (speedGreaterThanMin) {
        color = f.color;
      }

      return !speedGreaterThanMin;
    });

    return color;
  };

  return (
    <View className="flex-row justify-center" style={props.style}>
      <AppText className="text-gray-100">{`${strings.screens.DebugScreen.internet.speed}: `}</AppText>
      <AppText style={{ color: getSpeedColor() }}>{speed > 0 ? speed.toFixed(2) : '-'}</AppText>
    </View>
  );
};

export default DebugInternetWidget;
