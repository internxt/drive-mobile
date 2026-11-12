import React from 'react';
import { View, ViewProps } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import { cssInterop } from 'nativewind';

const AppSeparator = (props: ViewProps): JSX.Element => {
  const tailwind = useTailwind();

  return <View {...props} style={[tailwind('border-t border-gray-5'), { height: 1 }, props.style]} />;
};

cssInterop(AppSeparator, { className: 'style' });

export default AppSeparator;
