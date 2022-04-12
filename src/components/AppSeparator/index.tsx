import React from 'react';
import { View, ViewProps } from 'react-native';
import { tailwind } from '../../helpers/designSystem';

const AppSeparator = (props: ViewProps): JSX.Element => {
  return <View {...props} style={[tailwind('border-t border-neutral-30'), { height: 1 }, props.style]} />;
};

export default AppSeparator;
