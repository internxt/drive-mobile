import React, { Component } from "react";
import { compose } from "redux";
import { connect } from "react-redux";
import {
  StyleSheet,
  View,
  Text,
  TouchableHighlight,
  Image
} from "react-native";
import { withNavigation } from "react-navigation";

import { fileActions } from "../../actions";
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
    const { navigation, filesState } = this.props;
    const parentFolderId = filesState.folderContent.parentId;
    this.props.dispatch(fileActions.getFolderContent(parentFolderId));
    navigation.push("Home", { folderId: parentFolderId });
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
          <Text style={styles.label}>Back</Text>
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

const mapStateToProps = state => {
  return {
    ...state
  };
};

export default (ButtonPreviousDirComposed = compose(
  connect(mapStateToProps),
  withNavigation
)(ButtonPreviousDir));
