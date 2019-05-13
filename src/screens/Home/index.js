import React, { Component } from "react";
import { StyleSheet, Text, View, Linking } from "react-native";
import { compose } from "redux";
import { connect } from "react-redux";

import prettysize from 'prettysize'

import AppMenu from '../../components/AppMenu'
import FileList from '../../components/FileList'
import ButtonPreviousDir from '../../components/ButtonPreviousDir'
import ProgressBar from '../../components/ProgressBar'
import Separator from '../../components/Separator'
import SettingsItem from '../../components/SettingsItem'

import { fileActions, layoutActions, userActions } from "../../actions";

import Modal from 'react-native-modalbox';

class Home extends Component {
  constructor(props) {
    super(props);

    this.state = {
      folderId: null,
      folderName: "Home",
      backButtonVisible: false,
      token: "",
      user: {},

      usage: {
        used: 0,
        maxLimit: 1024 * 1024 * 1024
      }
    };
  }

  componentWillReceiveProps(nextProps) {

    if (nextProps.layoutState.showSettingsModal) {
      this.refs.modalSettings.open();
      this.props.dispatch(layoutActions.closeSettings());
    }

    const folderId = parseInt(nextProps.navigation.getParam("folderId", "undefined"));
    const { token, user } = this.props.authenticationState;

    // If logged out
    if (nextProps.authenticationState.loggedIn === false) {
      this.props.navigation.replace("Auth");
    }

    // Set active Folder ID
    if (folderId !== this.state.folderId) {
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

  loadUsage = () => {
    const user = this.props.authenticationState.user.email;

    fetch(`${process.env.REACT_APP_API_URL}/api/limit`, {
      method: 'post',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: user
      })
    }
    ).then(res => res.json())
      .then(res => {
        var copyUsage = this.state.usage;
        copyUsage.maxLimit = res.maxSpaceBytes;
        this.setState({ usage: copyUsage })
      }).catch(err => {
        console.log(err);
      });

    fetch(`${process.env.REACT_APP_API_URL}/api/usage`, {
      method: 'post',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: user })
    }
    ).then(res => res.json())
      .then(res => {
        var copyUsage = this.state.usage;
        copyUsage.used = res.total;
        this.setState({ usage: copyUsage })
      }).catch(err => {
        console.log(err);
      });
  }

  render() {
    const { navigation, filesState } = this.props;

    const ProgressBarStyle = {
      height: 6,
      marginLeft: 26,
      marginRight: 26,
      marginTop: 18,
      marginBottom: 23,
      borderRadius: 1.3
    }

    return (
      <View style={styles.container}>
        <Modal
          position={"bottom"}
          ref={"modalSettings"}
          style={styles.modalSettings}
          onOpened={this.loadUsage}
          backButtonClose={true}
          backdropPressToClose={true}>
          <View style={styles.drawerKnob}></View>

          <Text style={{ fontSize: 20, fontWeight: 'bold', marginLeft: 26, marginTop: 40, fontFamily: 'CerebriSans-Bold' }}>
            {this.props.authenticationState.user.name} {this.props.authenticationState.user.lastname}
          </Text>

          <ProgressBar
            styleBar={ProgressBarStyle}
            styleProgress={{ height: 6 }}
            totalValue={this.state.usage.maxLimit}
            usedValue={this.state.usage.used}
          />

          <Text style={{ fontFamily: 'CerebriSans-Regular', fontSize: 15, paddingLeft: 24, paddingBottom: 13 }}>
            <Text>Used</Text>
            <Text style={{ fontWeight: 'bold' }}> {prettysize(this.state.usage.used)} </Text>
            <Text>of</Text>
            <Text style={{ fontWeight: 'bold' }}> {prettysize(this.state.usage.maxLimit)} </Text>
          </Text>

          <Separator />

          <SettingsItem text="Storage" onClick={() => this.props.navigation.push("Storage")} />
          <SettingsItem text="Contact Us" onClick={() => Linking.openURL('mailto:hello@internxt.com')} />

          <Separator />

          <SettingsItem text="Sign out" onClick={() => this.props.dispatch(userActions.signout())} />
        </Modal>

        <View style={{ height: 17.5 }}></View>

        <AppMenu navigation={navigation} />

        <View style={styles.breadcrumbs}>
          <Text style={styles.breadcrumbsTitle}>
            {filesState.folderContent && filesState.folderContent.parentId ? filesState.folderContent.name : "Home"}
          </Text>
          {this.state.backButtonVisible && <ButtonPreviousDir />}
        </View>

        <FileList downloadFile={this.downloadfile} />
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
  drawerKnob: {
    backgroundColor: '#d8d8d8',
    width: 56,
    height: 7,
    borderRadius: 4,
    alignSelf: 'center',
    marginTop: 10
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
  },
  modalSettings: {
    height: 383
  },
  modalSettingsProgressBar: {
    height: 6.5,
    marginLeft: 24,
    marginRight: 24
  }
});

const mapStateToProps = state => {
  return {
    ...state
  };
};

export default (HomeComposed = compose(connect(mapStateToProps))(Home));
