import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { tailwind } from '../../helpers/designSystem';

interface ProgressBarProps {
  currentValue: number;
  totalValue: number;
  style?: StyleProp<ViewStyle>;
  progressStyle?: StyleProp<ViewStyle>;
}

export default function ProgressBar(props: ProgressBarProps): JSX.Element {
  const { totalValue, progressStyle } = props;
  const currentValue = props.currentValue >= totalValue ? totalValue : props.currentValue;
  const rightRounded = currentValue >= totalValue;

  const currentValueStyle = {
    size: {
      width: (currentValue * 100) / totalValue + '%',
    },
  };

  return (
    <View style={[tailwind('rounded h-2 bg-neutral-30'), props.style]}>
      <View
        style={[
          tailwind('rounded-tl rounded-bl bg-blue-60'),
          currentValueStyle.size,
          progressStyle,
          rightRounded && tailwind('rounded-tr rounded-br'),
        ]}
      />
    </View>
  );
}
