import React, { Component } from "react";
import { StyleSheet, Text, View, TouchableHighlight } from "react-native";

import AppMenu from "../../components/AppMenu/AppMenu";
import PlanListItem from "../../components/PlanListItem/PlanListItem";
import ProgressBar from "../../components/ProgressBar/ProgressBar";

class Settings extends Component {
  constructor(props) {
    super(props);

    this.state = {
      usage: {
        activePlanId: 0,
        used: 8,
        remaining: 2
      },
      plans: [
        {
          id: 0,
          price: "Free",
          amount: 10,
          unit: "GB",
          active: true
        },
        {
          id: 1,
          price: "$1.49 / month",
          amount: 100,
          unit: "GB",
          active: false
        },
        {
          id: 2,
          price: "$4.99 / month",
          amount: 1,
          unit: "TB",
          active: false
        }
      ],
      activePlan: {
        id: 0,
        price: "Free",
        amount: 10,
        unit: "GB",
        active: true
      }
    };
  }

  render() {
    const { navigation, plans, usage, activePlan } = this.state;
    const breadcrumbs = {
      name: "Settings"
    };

    return (
      <View style={styles.container}>
        <AppMenu navigation={navigation} breadcrumbs={breadcrumbs} />
        <View style={styles.titleWrapper}>
          <Text style={styles.title}>Storage Space</Text>
          <Text style={styles.subtitleInline}>
            Used {usage.used}
            {activePlan.unit} of {activePlan.amount}
            {activePlan.unit}
          </Text>
        </View>

        <ProgressBar totalValue={activePlan.amount} usedValue={usage.used} />

        <View style={styles.legendWrapper}>
          <View style={styles.legendFill} />
          <Text style={styles.textLegend}>
            Used storage space ({usage.used}
            {activePlan.unit})
          </Text>
        </View>

        <View style={styles.legendWrapper}>
          <View style={styles.legendEmpty} />
          <Text style={styles.textLegend}>
            Unused storage space ({usage.remaining}
            {activePlan.unit})
          </Text>
        </View>

        <View style={styles.divider} />

        <View>
          <Text style={styles.title}>Storage Plans</Text>
          <Text style={styles.subtitle}>
            You are currently using {activePlan.amount}
            {activePlan.unit} for {activePlan.price.toLowerCase()}.
          </Text>
        </View>

        {plans.map(plan => (
          <PlanListItem
            plan={plan}
            theme={plan.id === activePlan.id ? "medium" : "light"}
            key={plan.id}
            // clickHandler={this.props.navigation.push("plan.id")}
            navigation={navigation}
          />
        ))}

        <View style={styles.divider} />

        <TouchableHighlight
          style={styles.button}
          underlayColor="#FFF"
          onPress={() => this.props.navigation.navigate("SignIn")}
        >
          <Text style={styles.buttonLabel}>Sign Out</Text>
        </TouchableHighlight>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: 20
  },
  titleWrapper: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  title: {
    fontFamily: "CircularStd-Bold",
    fontSize: 22,
    letterSpacing: -0.7,
    color: "#000000",
    marginBottom: 15
  },
  subtitle: {
    fontFamily: "CircularStd-Book",
    fontSize: 18,
    letterSpacing: -0.2,
    lineHeight: 22,
    color: "#404040",
    maxWidth: 250,
    marginBottom: 20
  },
  textLegend: {
    fontFamily: "CircularStd-Book",
    fontSize: 17,
    letterSpacing: -0.2,
    color: "#404040"
  },
  subtitleInline: {
    fontFamily: "CircularStd-Book",
    fontSize: 15,
    letterSpacing: -0.2,
    color: "#404040"
  },
  legendWrapper: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginBottom: 10
  },
  legendFill: {
    width: 16,
    height: 16,
    backgroundColor: "#4b66ff",
    borderRadius: 16,
    marginRight: 10
  },
  legendEmpty: {
    width: 16,
    height: 16,
    backgroundColor: "#e8e8e8",
    borderRadius: 16,
    marginRight: 10
  },
  divider: {
    position: "relative",
    height: 2,
    backgroundColor: "#f2f2f2",
    marginTop: 5,
    marginBottom: 5
  },
  button: {
    height: 24,
    marginBottom: 10,
    marginTop: 15
  },
  buttonLabel: {
    fontFamily: "CircularStd-Bold",
    color: "#4b66ff",
    fontSize: 19,
    letterSpacing: -0.2
  }
});

export default Settings;
