import React from 'react'
import { StyleSheet, View } from 'react-native';

export default function Separator(props: any) {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  separator: {
    borderWidth: 1,
    height: 1,
    borderColor: '#f2f2f2',
    marginTop: 12,
    marginBottom: 12
  }
});
