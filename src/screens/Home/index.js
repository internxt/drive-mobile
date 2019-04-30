import React, { Component } from "react";
import { StyleSheet, Text, View } from "react-native";
import { compose } from "redux";
import { connect } from "react-redux";

import AppMenu from "../../components/AppMenu";
import FileList from "../../components/FileList";
import ButtonPreviousDir from "../../components/ButtonPreviousDir";
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
    const { token, user } = this.props.authenticationState;

    // If logged out
    if (this.props.authenticationState.loggedIn === false) {
      this.props.navigation.popToTop();
    }

    // Set active Folder ID
    if (folderId !== this.state.folderId) {
      this.props.dispatch(fileActions.getFolderContent(folderId));
      this.setState({
        folderId,
        backButtonVisible: folderId !== user.root_folder_id
      });
    }

    if (user !== this.state.user) {
      this.setState({
        token,
        user
      });
    }
  }

  downloadfile(file) {
    this.props.dispatch(fileActions.downloadFile(this.state.user, file));
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

        <FileList downloadFile={this.downloadfile}/>
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
