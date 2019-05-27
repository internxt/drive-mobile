import React, { Component, Fragment } from "react";
import { StyleSheet, Text, View, TouchableHighlight, Platform, Alert } from "react-native";
import { compose } from "redux";
import { connect } from 'react-redux';

import AppMenu from "../../components/AppMenu";
import PlanListItem from "../../components/PlanListItem";
import { userActions } from "../../actions";


class SubscriptionDetails extends Component {
  constructor(props) {
    super(props);
    this.state = {
      products: Platform.select({
        android: ['android.test'],
        ios: []
      })
    }
  }

  componentWillReceiveProps(nextProps) {
    // Go back when plan has changed
    if (nextProps.settingsState.plan_changed) {
      const { plan } = this.props.navigation.state.params;
      Alert.alert('Plan purchased', `${plan.name} plan successfully purchased`);
      nextProps.navigation.goBack();
    }
  }

  launchBuyNow = async () => {
    try {
      // Initialize in-app purchase
      const result = await RNIap.initConnection();

      // Purchase subscription
      const subscription = await RNIap.buySubscription(this.state.products[0]);

      console.log(`Subscription ${this.state.products[0]} purchased.`)
      console.log(subscription);
    } catch (error) {
      console.log(error);
    } finally {
      await RNIap.endConnection();
    }
  }

  render() {
    const { navigation } = this.props;
    const { plan } = navigation.state.params;
    const isPaidPlan = plan.id !== 0;
    const breadcrumbs = {
      name: "Storage"
    };

    return (
      <Fragment>
        <View style={styles.container}>
          <AppMenu navigation={navigation} breadcrumbs={breadcrumbs} />
          <Text style={styles.title}>Subscription details</Text>

          <PlanListItem plan={plan} navigation={navigation} />

          {isPaidPlan && (
            <Text style={styles.text}>
              Your payment account will be charged automatically when subscription period ends. Your payment will be charged to your payment account once
              you confirm your purchase below.
            </Text>
          )}
        </View>
        {isPaidPlan && (
          <TouchableHighlight
            style={styles.button}
            underlayColor="#FFF"
            onPress={this.launchBuyNow}
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

const mapStateToProps = state => {
  return {
    ...state
  };
};

export default (SubscriptionDetailsComposed = compose(connect(mapStateToProps))(SubscriptionDetails));
