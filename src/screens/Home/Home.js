import React, { Component } from "react";
import { StyleSheet, Text, View, Button } from "react-native";
import { compose } from "redux";
import { connect } from "react-redux";

import AppMenu from "../../components/AppMenu/AppMenu";
import FileList from "../../components/FileList/FileList";
import ButtonPreviousDir from "../../components/ButtonPreviousDir/ButtonPreviousDir";
import { fileActions } from "../../actions";

class Home extends Component {
  constructor(props) {
    super(props);

    this.state = {
      folderId: null,
      folderName: "Home",
      backButtonVisible: false,
      token: "",
      user: {}
    };
  }

  componentWillReceiveProps(nextProps) {
    const folderId = parseFloat(
      nextProps.navigation.getParam("folderId", "undefined")
    );

    // Set active Folder ID
    if (folderId !== this.state.folderId) {
      this.props.dispatch(fileActions.getFolderContent(folderId));
      this.setState({
        folderId: isNaN(folderId) ? null : folderId
      });
    }

    const { token, user } = this.props.authenticationState;

    if (user !== this.state.user) {
      this.setState({
        backButtonVisible: folderId !== user.root_folder_id,
        token,
        user
      });
    }
  }

  render() {
    const { navigation, filesState } = this.props;

    return (
      <View style={styles.container}>
        <AppMenu navigation={navigation} />
        <View style={styles.breadcrumbs}>
          <Text style={styles.breadcrumbsTitle}>
            {filesState.folderContent && filesState.folderContent.parentId
              ? filesState.folderContent.name
              : "Home"}
          </Text>
          {this.state.backButtonVisible && <ButtonPreviousDir />}
        </View>

        <FileList />

        <Button
          title="Go back to sign in"
          onPress={() => {
            // Go to the top of the stack - SignIn screen
            navigation.popToTop();
          }}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    backgroundColor: "#fff"
  },
  breadcrumbs: {
    display: "flex",
    flexWrap: "nowrap",
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomColor: "#e6e6e6",
    borderBottomWidth: 2,
    marginTop: 30,
    paddingBottom: 30
  },
  breadcrumbsTitle: {
    fontFamily: "CircularStd-Bold",
    fontSize: 21,
    letterSpacing: -0.2,
    paddingLeft: 20,
    color: "#000000"
  }
});

const mapStateToProps = state => {
  return {
    ...state
  };
};

export default (HomeComposed = compose(connect(mapStateToProps))(Home));
