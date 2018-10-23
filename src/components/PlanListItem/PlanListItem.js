import React, { Component } from "react";
import { StyleSheet, View, Text, TouchableHighlight } from "react-native";

class PlanListItem extends Component {
  render() {
    const { navigation, plan, theme } = this.props;
    const extendStyles = StyleSheet.create({
      container: {
        backgroundColor: variants[theme].background
      },
      label: {
        color: variants[theme].color
      }
    });

    return (
      <TouchableHighlight
        underlayColor="#FFF"
        onPress={() => navigation.push("SubscriptionDetails", { plan: plan })}
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

const variants = {
  light: {
    color: "#404040",
    background: "#f5f5f5",
  },
  medium: {
    color: "#2c6bc9",
    background: "#f2f5ff",
  },
  dark: {
    color: "#fff",
    background: "#4385f4"
  }
}

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
