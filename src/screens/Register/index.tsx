import React from 'react'
import { View, Text } from "react-native";
import { connect } from "react-redux";

function Register(props: any) {
  return <View>
    <Text>Register</Text>
  </View>
}

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(Register)