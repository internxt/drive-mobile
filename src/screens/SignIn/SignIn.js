import React, { Component } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableHighlight
} from "react-native";
import { LinearGradient } from "expo";

class SignIn extends Component {
  render() {
    return (
      <LinearGradient
        style={styles.container}
        colors={["#2c5fb8", "#1686cc", "#3fafeb"]}
      >
        <Image
          style={styles.logo}
          source={require("../../../assets/images/logo.png")}
        />

        <View>
          <Text style={styles.title}>X Cloud</Text>
          <Text style={styles.subtitle}>Secure cloud storage.</Text>
        </View>

        <View style={styles.buttonWrapper}>
          <TouchableHighlight
            style={styles.button}
            underlayColor={styles.button.backgroundColor}
            onPress={() => {
              this.props.navigation.navigate("Home");
            }}
          >
            <Text style={styles.buttonLabel}>Sign in with Civic</Text>
          </TouchableHighlight>

          <Text style={styles.redirectMessage}>
            You will be re-directed to the Civic App
          </Text>
        </View>
      </LinearGradient>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    backgroundColor: "#2c5fb8",
    padding: 20
  },
  logo: {
    height: 52.4,
    width: 99,
    marginTop: 60
  },
  title: {
    fontFamily: "CerebriSans-Bold",
    fontSize: 54.6,
    letterSpacing: -1.7,
    color: "#fff"
  },
  subtitle: {
    fontFamily: "CerebriSans-Medium",
    fontSize: 29,
    color: "#fff",
    opacity: 0.76
  },
  buttonWrapper: {
    display: "flex",
    alignItems: "center",
    marginBottom: 30
  },
  button: {
    alignSelf: "stretch",
    height: 49.5,
    borderRadius: 24.5,
    backgroundColor: "#00aaff",
    paddingLeft: 20,
    paddingRight: 20,
    marginBottom: 10
  },
  buttonLabel: {
    fontFamily: "CircularStd-Medium",
    fontSize: 18,
    lineHeight: 49.5,
    letterSpacing: 0.2,
    textAlign: "center",
    color: "#fff"
  },
  redirectMessage: {
    fontFamily: "CircularStd-Book",
    fontSize: 14,
    letterSpacing: 0.3,
    color: "#fff",
    opacity: 0.6
  }
});

export default SignIn;
