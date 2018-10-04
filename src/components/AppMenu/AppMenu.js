import React, { Component } from "react";
import { StyleSheet, View } from "react-native";

import MenuItem from "./MenuItem";

class AppMenu extends Component {
  constructor(props) {
    super(props);

    this.handleMenuClick = this.handleMenuClick.bind(this);
  }

  handleMenuClick() {
    console.log("menu item clicked");
  }

  render() {
    return (
      <View style={styles.container}>
        <MenuItem name="search" />
        <MenuItem name="list" />
        <MenuItem name="upload" />
        <MenuItem name="create" />
        <MenuItem name="details" hidden />
        <MenuItem name="settings" />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    height: 51,
    flexDirection: "row",
    justifyContent: "center",
    backgroundColor: "#fff",
    marginTop: 30
  },
  button: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 51,
    height: 51,
    borderRadius: 25.5,
    backgroundColor: "#f7f7f7"
  },
  icon: {
    width: 25,
    height: 25,
    resizeMode: "contain"
  }
});

export default AppMenu;
