import React, { useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, ToastAndroid } from 'react-native'
import { useState } from "react";
import Constants from 'expo-constants'
import { connect } from 'react-redux';
import * as LocalAuthentication from 'expo-local-authentication';


interface BiometricProps {
  goToForm?: (screenName: string) => void
  authenticationState?: any
  dispatch?: any
  navigation?: any
}

function Biometric(props: any) {
  const [compatible, setIsCompatible] = useState(false)
  const [biometric, setIsBiometric] = useState(false)
  const [result, setIsResult] = useState('')

  useEffect(() => {
    checkDeviceForHardware();
    checkForBiometric();
    if (!compatible && !biometric) {
      props.navigation.replace('FileExplorer')
    }
  })

  const checkDeviceForHardware = async () => {
    let compatible = await LocalAuthentication.hasHardwareAsync();
    if (compatible) {
      console.log(compatible)
    } else {
      console.log(compatible)
      //ToastAndroid.show("Biometric is not available in this device", ToastAndroid.SHORT);
    }
    setIsCompatible(compatible)
  };

  const checkForBiometric = async () => {
    let biometric = await LocalAuthentication.isEnrolledAsync();
    setIsBiometric(biometric)
  };

  const checkType = async () => {
    let type = await LocalAuthentication.supportedAuthenticationTypesAsync();
  }

  const scanBiometric = async () => {
    let result = await LocalAuthentication.authenticateAsync();
    console.log('Scan Result:', result);
    let res;
    res = JSON.stringify(result)
    setIsResult(res)
  };

  const showAndroidAlert = () => {
    Alert.alert(
      'Fingerprint Scan',
      'Place your finger over the touch sensor and press scan.',
      [
        {
          text: 'Scan',
          onPress: () => {
            scanBiometric();
          },
        },
        {
          text: 'Cancel',
          onPress: () => console.log('Cancel'),
          style: 'cancel',
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Compatible Device? {compatible === true ? 'True' : 'False'}
      </Text>
      <Text style={styles.text}>
        Fingerprings Saved?{' '}
        {biometric === true ? 'True' : 'False'}
      </Text>
      <TouchableOpacity
        onPress={
          Platform.OS === 'android'
            ? showAndroidAlert
            : scanBiometric
        }
        style={styles.button}>
        <Text style={styles.buttonText}>SCAN</Text>
      </TouchableOpacity>
      <Text>{result}</Text>
    </View>
  );
}
const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(Biometric)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: Constants.statusBarHeight,
    backgroundColor: '#ecf0f1',
  },
  text: {
    fontSize: 18,
    textAlign: 'center',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 150,
    height: 60,
    backgroundColor: '#056ecf',
    borderRadius: 5,
  },
  buttonText: {
    fontSize: 30,
    color: '#fff',
  },
});







