import React from 'react'
import { StyleSheet, View, ViewProps } from 'react-native';

export default function Separator(props: ViewProps): JSX.Element {
  return <View {...props} style={[styles.separator, props.style]} />;
}

const styles = StyleSheet.create({
  separator: {
    borderColor: '#EBECF0',
    borderTopWidth: 1,
    height: 1,
    marginBottom: 12,
    marginTop: 12
  }
});
