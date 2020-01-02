import React, { Component } from "react";
import { StyleSheet, View, Text } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';

import { SCREEN_WIDTH } from "../../styles";

class ProgressBar extends Component {

  render() {
    var { totalValue, usedValue, styleBar, styleProgress } = this.props;

    if (usedValue > totalValue) {
      usedValue = totalValue;
    }

    const screenPadding = styleBar.marginLeft + styleBar.marginRight;
    const usedValueStyle = {
      size: {
        width: Math.min((SCREEN_WIDTH - screenPadding) * (usedValue / totalValue), (SCREEN_WIDTH - screenPadding))
      }
    };

    return (
      <View style={[styles.container, styleBar]}>
        <LinearGradient
          colors={["#4b66ff", "#538dff"]}
          start={[0.5, 0]}
          style={[styles.inner, usedValueStyle.size, styleProgress]}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    height: 10,
    borderRadius: 3,
    backgroundColor: "#e8e8e8",
    marginBottom: 10
  },
  inner: {
    position: "absolute",
    left: 0,
    top: 0,
    height: 10,
    borderRadius: 9
  }
});

export default ProgressBar;
