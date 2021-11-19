import React from 'react';
import { View } from 'react-native';
import { tailwind } from '../../helpers/designSystem';

interface ProgressBarProps {
  usedValue: number;
  totalValue: number;
  styleProgress: any;
}

export default function ProgressBar(props: ProgressBarProps): JSX.Element {
  const { totalValue, styleProgress } = props;
  let usedValue = props.usedValue;
  let rightRounded = false;

  if (usedValue >= totalValue) {
    usedValue = totalValue;
    rightRounded = true;
  }

  const usedValueStyle = {
    size: {
      width: (usedValue * 100) / totalValue + '%',
    },
  };

  return (
    <View style={tailwind('rounded h-2 bg-neutral-40')}>
      <View
        style={[
          tailwind('rounded-tl rounded-bl bg-blue-60'),
          usedValueStyle.size,
          styleProgress,
          rightRounded && tailwind('rounded-tr rounded-br'),
        ]}
      />
    </View>
  );
}
