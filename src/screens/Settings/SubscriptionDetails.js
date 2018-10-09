import React, { Component, Fragment } from "react";
import { StyleSheet, Text, View, TouchableHighlight } from "react-native";

import AppMenu from "../../components/AppMenu/AppMenu";
import PlanListItem from "../../components/PlanListItem/PlanListItem";

class SubscriptionDetails extends Component {
  render() {
    const { navigation } = this.props;
    const { plan } = navigation.state.params;
    const isPaidPlan = plan.id !== 0;
    const breadcrumbs = {
      name: "Settings"
    };

    return (
      <Fragment>
        <View style={styles.container}>
          <AppMenu navigation={navigation} breadcrumbs={breadcrumbs} />
          <Text style={styles.title}>Subscription details</Text>

          <PlanListItem plan={plan} theme={"dark"} navigation={navigation} />

          {isPaidPlan && (
            <Text style={styles.text}>
              Your iTunes Account will be charged $1.49 automatically each
              month. Your payment will be charged to your iTunes Account once
              you confirm your purchase below.
            </Text>
          )}
        </View>
        {isPaidPlan && (
          <TouchableHighlight
            style={styles.button}
            underlayColor="#FFF"
            onPress={() => console.log("Buy Now clicked")}
          >
            <Text style={styles.buttonLabel}>Buy Now</Text>
          </TouchableHighlight>
        )}
      </Fragment>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    padding: 20
  },
  title: {
    fontFamily: "CircularStd-Bold",
    fontSize: 22,
    letterSpacing: -0.7,
    color: "#000000",
    marginBottom: 30,
    marginTop: 20
  },
  text: {
    fontFamily: "CircularStd-Book",
    fontSize: 17,
    letterSpacing: -0.2,
    color: "#404040",
    marginTop: 30
  },
  button: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: 73,
    backgroundColor: "#4385f4"
  },
  buttonLabel: {
    fontFamily: "CircularStd-Bold",
    color: "#fff",
    fontSize: 20,
    letterSpacing: -0.1
  }
});

export default SubscriptionDetails;
