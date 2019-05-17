import React, { Component, Fragment } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableHighlight,
  Image, Linking, Alert
} from "react-native";
import { compose } from "redux";
import { connect } from "react-redux";

import MenuItem from "./MenuItem";
import { getIcon } from "../../helpers";
import { layoutActions, fileActions } from "../../actions";

import { DocumentPicker, FileSystem, WebBrowser } from 'expo';

const arrowBack = getIcon("back");

class AppMenu extends Component {
  constructor(props) {
    super(props);

    this.handleMenuClick = this.handleMenuClick.bind(this);
    this.handleFolderCreate = this.handleFolderCreate.bind(this);
    this.uploadFile = this.uploadFile.bind(this);
    this.downloadFile = this.downloadFile.bind(this);
  }

  componentWillReceiveProps(newProps) {
    if (newProps.filesState.startDownloadSelectedFile) {
      this.props.dispatch(fileActions.downloadSelectedFileStop());
      this.downloadFile();
    }
  }

  handleMenuClick() {
    Alert.alert('Action', 'Menu item clicked');
  }

  handleFolderCreate(parentFolderId) {
    this.props.navigation.push("CreateFolder", { parentFolderId });
  }

  downloadFile = async () => {
    const fileId = this.props.filesState.selectedFile.fileId;
    const fileName = this.props.filesState.selectedFile.name + '.' + this.props.filesState.selectedFile.type;
    const token = this.props.authenticationState.token;
    const mnemonic = this.props.authenticationState.user.mnemonic;

    const headers = {
      "Authorization": `Bearer ${token}`,
      "internxt-mnemonic": mnemonic,
      "Content-type": "application/json"
    };

    // Generate token:
    fetch(`${process.env.REACT_APP_API_URL}/api/storage/share/file/${fileId}`, {
      method: 'POST',
      headers
    }).then(async result => {
      var data = await result.json();
      return { res: result, data };
    }).then(result => {
      if (result.res.status != 200) {
        if (result.data.error) {
          Alert.alert('Error', result.data.error);
        } else {
          Alert.alert('Error', 'Cannot download file');
        }
      } else {
        const linkToken = result.data.token;
        const proxy = 'https://api.internxt.com:8081';
        Linking.openURL(`${proxy}/${process.env.REACT_APP_API_URL}/api/storage/share/${linkToken}`);
      }
    }).catch(err => {
      console.log("Error", err);
      Alert.alert('Error', 'Internal error');
    });

  }

  uploadFile = async () => {
    const self = this;

    DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: false }).then(async result => {
      if (result.type == 'cancel') {
        return;
      }

      this.props.dispatch(fileActions.uploadFileStart(result.name));

      const body = new FormData();
      body.append('xfile', {
        uri: result.uri,
        type: 'application/octet-stream',
        name: result.name
      });

      const token = this.props.authenticationState.token;
      const mnemonic = this.props.authenticationState.user.mnemonic;

      const headers = {
        "Authorization": `Bearer ${token}`,
        "internxt-mnemonic": mnemonic,
        "Content-type": "multipart/form-data"
      };

      fetch(`${process.env.REACT_APP_API_URL}/api/storage/folder/${this.props.filesState.folderContent.currentFolder}/upload`, {
        method: 'POST',
        headers,
        body
      }).then(async resultFetch => {
        var data = resultFetch.json();
        return { res: resultFetch, data };
      }).then(resultFetch => {
        if (resultFetch.res.status == 201) {
          self.props.dispatch(fileActions.getFolderContent(self.props.filesState.folderContent.currentFolder));
        } else {
          Alert.alert('Error', resultFetch.data.error ? resultFetch.data.error : 'Cannot upload file');
        }
        this.props.dispatch(fileActions.uploadFileFinished());
      }).catch(errFetch => {
        this.props.dispatch(fileActions.uploadFileFinished());
        Alert.alert('Error', 'Cannot upload file');
        console.log("Error fetching", errFetch);
      });

    }).catch(err => {
      console.log('Error:', err);
      this.props.dispatch(fileActions.uploadFileFinished());
    });

  }

  render() {
    const {
      filesState: { folderContent, selectedFile }
    } = this.props;

    const isRoot = folderContent && folderContent.hierarchy_level === 1;
    const isFileSelected = Boolean(selectedFile);
    const isButtonDetailsHidden = isRoot && !isFileSelected;

    let content = (
      <Fragment>
        <View style={{ flexDirection: 'row-reverse', flex: 1, alignItems: 'flex-end' }}>
          {/*
        <MenuItem
          name="search"
          onClickHandler={() => this.props.dispatch(layoutActions.openSearch())}
        />
        <MenuItem name="list" onClickHandler={this.downloadFile} />
        */}
          <MenuItem
            name="settings"
            onClickHandler={() => {
              this.props.dispatch(layoutActions.openSettings());
            }}

          />

          <MenuItem
            name="create"
            onClickHandler={() => this.handleFolderCreate(folderContent.id)}
          />

          <MenuItem name="upload" onClickHandler={this.uploadFile} />

          {/*
        <MenuItem
          name="details"
          hidden={isButtonDetailsHidden}
          onClickHandler={() =>
            isFileSelected
              ? console.log("file details")
              : console.log("folder details")
          }
        />
        */}

        </View>
      </Fragment>
    );

    if (this.props.breadcrumbs) {
      const { name } = this.props.breadcrumbs;

      content = (
        <TouchableHighlight
          style={styles.button}
          underlayColor="#FFF"
          onPress={() => this.props.navigation.goBack()}
        >
          <View style={styles.breadcrumbs}>
            <Image style={styles.icon} source={arrowBack} />
            <Text style={styles.breadcrumbsLabel}>{name}</Text>
            <View style={{ borderBottomWidth: 1, borderBottomColor: '#f2f2f2' }}></View>
          </View>
        </TouchableHighlight>
      );
    }

    return <View style={styles.container}>{content}</View>;
  }
}

const styles = StyleSheet.create({
  container: {
    height: 54,
    flexDirection: "row",
    justifyContent: "flex-start",
    backgroundColor: "#fff",
    marginTop: 25,
    paddingTop: 3
  },
  button: {
    flex: 1
  },
  breadcrumbs: {
    position: "relative",
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },
  breadcrumbsLabel: {
    fontFamily: "CircularStd-Bold",
    fontSize: 21,
    letterSpacing: -0.2,
    color: "#000000"
  },
  icon: {
    position: "absolute",
    left: 0,
    top: 17,
    width: 10,
    height: 17,
    resizeMode: "contain"
  }
});

const mapStateToProps = state => {
  return {
    ...state
  };
};

export default (AppMenuComposed = compose(connect(mapStateToProps))(AppMenu));
