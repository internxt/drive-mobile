import React, { Component, Fragment } from "react";
import { StyleSheet, Text, View, TouchableHighlight, Platform, Alert } from "react-native";
import stripe from 'tipsi-stripe';

import AppMenu from "../../components/AppMenu";
import PlanListItem from "../../components/PlanListItem";
import { userActions } from "../../actions";

class SubscriptionDetails extends Component {
  
  launchBuyNow = async () => {
    try {
      // Set stripe opts
      stripe.setOptions({
        publishableKey: process.env.REACT_APP_STRIPE_KEY,
        merchantId: "merchant.com.internxt.xcloud",
        androidPayMode: "production",
      });
      // Wait for stripe to be initialized
      while(!stripe.stripeInitialized) { setTimeout({}, 250); }
      console.log('Stripe initialized')

      // Check if platform supports pay
      let supported = await stripe.deviceSupportsNativePay();
      console.log(`Supported Google/Apple Pay: ${supported}`);
      if (supported) {        
        // Set opts which depends on platform
        const { plan } = this.props.navigation.state.params;
        let options = {};
        if (Platform.OS === "android") { 
          options = {
            total_price: plan.price_eur,
            currency_code: 'EUR',
            billing_address_required: true,
            line_items: [{
              currency_code: 'EUR',
              description: plan.name,
              total_price: plan.price_eur,
              unit_price: plan.price_eur,
              quantity: '1'
            }]
          };  
        }
        else { 
          options = {
            requiredBillingAddressFields: ['all'],
            currencyCode: 'EUR',
            countryCode: 'ES'
          }
        }
    
        const items = [{ label: plan.name, amount: plan.price_eur }];

        const token = await stripe.paymentRequestWithNativePay(options, items);
        console.log(token);
        this.props.navigation.dispatch(userActions.payment(token, plan.id));
        
      } else {
        Alert.alert('Error','Your device does not support payment in app. Go to Web app for credit card payment.');
      }
    } catch (error) {
      console.log(error);
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

export default SubscriptionDetails;
