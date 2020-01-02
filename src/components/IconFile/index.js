import React, { Component } from "react";
import { StyleSheet, View, Text, ActivityIndicator } from "react-native";

class IconFile extends Component {
  render() {
    const { label = "", isUploading = false } = this.props;

    return (
      <View style={styles.wrapper}>
        {isUploading ? <ActivityIndicator style={styles.activityIndicator} /> : <Text numberOfLines={1} style={styles.text}>{label.toUpperCase()}</Text>}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    width: 44,
    height: 42,
    marginLeft: 25,
    marginRight: 25,
    borderRadius: 3,
    borderColor: "#5291ff",
    borderWidth: 0.6
  },
  text: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 5,
    fontFamily: "CircularStd-Bold",
    fontSize: 9,
    letterSpacing: -0.2,
    color: "#2e7bff",
    textAlign: "center",
    paddingHorizontal: 5
  },
  activityIndicator: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0
  }
});

export default IconFile;
