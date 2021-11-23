import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { tailwind } from '../../helpers/designSystem';

export default function Separator(props: ViewProps): JSX.Element {
  return <View {...props} style={[tailwind('border-t border-neutral-30'), styles.separator, props.style]} />;
}

const styles = StyleSheet.create({
  separator: {
    height: 1,
  },
});
