import React, { Component } from 'react';
import { StyleSheet, View, Text } from 'react-native';

class EmptyDirectory extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const message = this.props.isRoot
      ? 'Your Internxt Drive is empty!'
      : 'This folder is empty';
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>{message}</Text>
        <Text style={styles.subheading}>
          Click the upload button to get started.
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  heading: {
    fontFamily: 'CircularStd-Black',
    fontSize: 25,
    letterSpacing: -0.8,
    color: '#000000',
    marginBottom: 10
  },
  subheading: {
    fontFamily: 'CircularStd-Book',
    fontSize: 17,
    opacity: 0.84,
    letterSpacing: -0.1,
    color: '#404040'
  }
});

export default EmptyDirectory;
