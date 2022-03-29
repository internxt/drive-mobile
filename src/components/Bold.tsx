import React from 'react';
import { StyleSheet } from 'react-native';
import AppText from './AppText';

interface BoldProps {
  children?: string;
}

export default function Bold(props: BoldProps): JSX.Element {
  return <AppText style={styles.bold}>{props.children}</AppText>;
}

const styles = StyleSheet.create({
  bold: {
    fontWeight: 'bold',
  },
});
