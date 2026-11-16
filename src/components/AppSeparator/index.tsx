import React from 'react';
import { View, ViewProps } from 'react-native';
import { cssInterop } from 'nativewind';

const AppSeparator = (props: ViewProps): JSX.Element => {
  return <View {...props} className="border-t border-gray-5" style={[{ height: 1 }, props.style]} />;
};

cssInterop(AppSeparator, { className: 'style' });

export default AppSeparator;
