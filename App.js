import React, { Component } from "react";
import { Text, View } from "react-native";

import AppNavigator from "./src/AppNavigator";
import {loadFonts} from './src/helpers'

export default class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      fontLoaded: false
    };
  }
  
  async componentDidMount() {
    try {
      await loadFonts();
      this.setState({ fontLoaded: true });
    } catch (error) {
      console.error("Error loading fonts", error);
    }
  }

  render() {
    if (this.state.fontLoaded) {
      return <AppNavigator />;
    }

    return (
      <View>
        <Text>Loading...</Text>
      </View>
    );
  }
}
