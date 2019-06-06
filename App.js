import React, { Component } from "react";
import { Text, View } from "react-native";
import { Provider } from "react-redux";
import './shim.js';

import AppNavigator from "./src/AppNavigator";
import { loadFonts } from "./src/helpers";
import { store } from "./src/store";

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
      return (
        <Provider store={store}>
          <AppNavigator />
        </Provider>
      );
    }

    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }
}

const styles = {
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  }
};

