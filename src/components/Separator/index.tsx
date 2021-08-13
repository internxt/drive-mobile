import React from 'react'
import { StyleSheet, View } from 'react-native';

export default function Separator(): JSX.Element {
  return <View style={styles.separator} />;
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
