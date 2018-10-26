import React, { Component } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableHighlight,
  Image
} from "react-native";
import { withNavigation } from "react-navigation";

import { getIcon } from "../../helpers";

class ButtonPreviousDir extends Component {
  constructor(props) {
    super(props);

    this.state = {
      iconArrowBack: getIcon("back")
    };

    this.goBack = this.goBack.bind(this);
  }

  goBack() {
    const { navigation } = this.props;
    navigation.push("Home", { parent: 0 });

    // TODO: Use navigation.goBack(); + set route params
    // navigation.goBack();
    // navigation.state.params.onSelect({ parent: true });
  }

  render() {
    return (
      <TouchableHighlight
        style={styles.button}
        underlayColor="#FFF"
        onPress={this.goBack}
      >
        <View style={styles.buttonWrapper}>
          <Image style={styles.icon} source={this.state.iconArrowBack} />
          <Text style={styles.label}>All Files</Text>
        </View>
      </TouchableHighlight>
    );
  }
}

const styles = StyleSheet.create({
  button: {},
  buttonWrapper: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20
  },
  icon: {
    height: 12,
    width: 8,
    marginRight: 5
  },
  label: {
    fontFamily: "CircularStd-Medium",
    fontSize: 19,
    letterSpacing: -0.2,
    color: "#000000"
  }
});

export default withNavigation(ButtonPreviousDir);
