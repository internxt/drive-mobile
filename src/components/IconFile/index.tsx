import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import tailwind from 'tailwind-rn';

interface IconFileProps {
  label: string;
  isLoading: boolean;
}

function IconFile(props: IconFileProps): JSX.Element {
  const { label = '', isLoading = false } = props;

  return (
    <View style={styles.wrapper}>
      {isLoading ? (
        <ActivityIndicator style={tailwind('absolute')} size="small" color="gray" />
      ) : (
        <Text numberOfLines={1} style={styles.text}>
          {label.toUpperCase()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  text: {
    bottom: 5,
    color: '#2e7bff',
    fontFamily: 'NeueEinstellung-Bold',
    fontSize: 9,
    left: 0,
    letterSpacing: -0.2,
    paddingHorizontal: 5,
    position: 'absolute',
    right: 0,
    textAlign: 'center',
  },
  wrapper: {
    alignItems: 'center',
    borderColor: '#5291ff',
    borderRadius: 3,
    borderWidth: 0.6,
    height: 42,
    justifyContent: 'center',
    marginLeft: 25,
    marginRight: 25,
    position: 'relative',
    width: 44,
  },
});

export default IconFile;
