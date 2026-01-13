import React from 'react';
import { View, ViewProps } from 'react-native';
import { useTailwind } from 'tailwind-rn';

const AppSeparator = (props: ViewProps): JSX.Element => {
  const tailwind = useTailwind();

  return <View {...props} style={[tailwind('border-t border-gray-5'), { height: 1 }, props.style]} />;
};

export default AppSeparator;
