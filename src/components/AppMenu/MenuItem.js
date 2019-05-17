import React, { Component } from "react";
import { StyleSheet, View, TouchableHighlight, Image } from "react-native";

import { getIcon } from "../../helpers";

class MenuItem extends Component {
  render() {
    const { name, hidden = false } = this.props;
    const imageSource = getIcon(name);
    let content = null;

    if (!hidden) {
      content = (
        <TouchableHighlight
          style={styles.button}
          underlayColor="#FFF"
          onPress={this.props.onClickHandler}
        >
          <Image style={styles.icon} source={imageSource} />
        </TouchableHighlight>
      );
    }

    return <View style={styles.container}>{content}</View>;
  }
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    backgroundColor: "#fff",
    marginRight: 10
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

export default MenuItem;
