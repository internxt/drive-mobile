import React, { Component } from "react";
import { StyleSheet, View, Text, TouchableHighlight } from "react-native";

class PlanListItem extends Component {
  render() {
    const { plan, theme, navigation } = this.props;
    const extendStyles = StyleSheet.create({
      container: {
        backgroundColor: backgrounds[theme]
      },
      label: {
        color: colors[theme]
      }
    });

    return (
      <TouchableHighlight
        underlayColor="#FFF"
        onPress={this.props.clickHandler ? this.props.clickHandler() : () => {}}
      >
        <View style={styles.row}>
          <View style={[styles.planStorageContainer, extendStyles.container]}>
            <Text style={[styles.planStorage, extendStyles.label]}>
              {plan.amount}
              {plan.unit}
            </Text>
          </View>
          <Text style={styles.planPrice}>{plan.price}</Text>
        </View>
      </TouchableHighlight>
    );
  }
}

const backgrounds = {
  light: "#f5f5f5",
  medium: "#f2f5ff",
  dark: "#4385f4"
};

const colors = {
  light: "#404040",
  medium: "#2c6bc9",
  dark: "#fff"
};

const styles = StyleSheet.create({
  row: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center"
  },
  planStorageContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: 95,
    height: 55,
    borderRadius: 3,
    marginRight: 10
  },
  planStorage: {
    fontFamily: "CircularStd-Black",
    fontSize: 20,
    color: "#404040",
    letterSpacing: -0.1,
    opacity: 0.64
  },
  planPrice: {
    fontFamily: "CircularStd-Bold",
    fontSize: 18,
    letterSpacing: -0.3,
    color: "#000000"
  }
});

export default PlanListItem;
