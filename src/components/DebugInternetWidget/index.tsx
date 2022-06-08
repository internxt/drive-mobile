import { useEffect, useState } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { measureConnectionSpeed, NetworkBandwidthTestResults } from 'react-native-network-bandwith-speed';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../assets/lang/strings';
import errorService from '../../services/ErrorService';
import notificationsService from '../../services/NotificationsService';
import { NotificationType } from '../../types';
import AppText from '../AppText';

interface DebugInternetWidgetProps {
  style?: StyleProp<ViewStyle>;
}

const DebugInternetWidget = (props: DebugInternetWidgetProps): JSX.Element => {
  const tailwind = useTailwind();
  const [speed, setSpeed] = useState(0);
  const bySpeedFeatures = [
    { min: 20, color: tailwind('text-green-40').color as string },
    { min: 10, color: tailwind('text-yellow-40').color as string },
    { min: 0, color: tailwind('text-red-60').color as string },
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

  useEffect(() => {
    const measure = async () => {
      try {
        const result: NetworkBandwidthTestResults = await measureConnectionSpeed();
        setSpeed(result.speed);
      } catch (err) {
        const castedError = errorService.castError(err);
        notificationsService.show({ text1: castedError.message, type: NotificationType.Error });
      }
    };

    measure();
  });

  return (
    <View style={[tailwind('flex-row justify-center'), props.style]}>
      <AppText style={tailwind('text-neutral-300')}>{`${strings.screens.DebugScreen.internet.speed}: `}</AppText>
      <AppText style={{ color: getSpeedColor() }}>{speed > 0 ? speed.toFixed(2) : '-'}</AppText>
    </View>
  );
};

export default DebugInternetWidget;
