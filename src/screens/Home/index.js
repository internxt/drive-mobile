import React, { Component } from "react";
import { StyleSheet, Text, TextInput, View, Linking, TouchableHighlight, Image, Alert } from "react-native";
import { compose } from "redux";
import { connect } from "react-redux";
import Modal from 'react-native-modalbox';
import prettysize from 'prettysize';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

import AppMenu from '../../components/AppMenu'
import FileList from '../../components/FileList'
import ButtonPreviousDir from '../../components/ButtonPreviousDir'
import ProgressBar from '../../components/ProgressBar'
import Separator from '../../components/Separator'
import SettingsItem from '../../components/SettingsItem'
import { colors, folderIconsList } from '../../constants'
import Icon from '../../../assets/icons/Icon'
import TimeAgo from "react-native-timeago";

import { fileActions, layoutActions, userActions } from "../../actions";
import { getIcon } from "../../helpers";

const iconDownload = getIcon('download');
const iconShare = getIcon('share');
const iconDelete = getIcon('delete');

class Home extends Component {
  constructor(props) {
    super(props);

    this.state = {
      folderId: null,
      folderName: "Home",
      backButtonVisible: false,
      token: "",
      user: {},
      selectedColor: '',
      selectedIcon: '',
      inputFileName: '',
      usage: {
        used: 0,
        maxLimit: 1024 * 1024 * 1024
      }
    };

    this.modalFolder = React.createRef();
    this.modalFile = React.createRef();
  }

  componentWillReceiveProps(nextProps) {
    // Manage showing settings modal
    if (nextProps.layoutState.showSettingsModal) {
      this.refs.modalSettings.open();
      this.props.dispatch(layoutActions.closeSettings());
    }

    // Manage showing folder modal
    if (nextProps.layoutState.showFolderModal) {
      this.modalFolder.current.open();
      this.props.dispatch(layoutActions.closeFolderModal());
    }

    // Manager showing file modal
    if (nextProps.layoutState.showFileModal) {
      this.modalFile.current.open();
      this.props.dispatch(layoutActions.closeFileModal());
    }

    // Set folder/file name if is selected
    if (nextProps.filesState.selectedFile) {
      this.setState({ inputFileName: nextProps.filesState.selectedFile.name })
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

  handleDeleteSelectedFile() {
    const fileToDelete = this.props.filesState.selectedFile;
    const token = this.props.authenticationState.token;
    const mnemonic = this.props.authenticationState.user.mnemonic;

    fetch(`${process.env.REACT_APP_API_URL}/api/storage/bucket/${fileToDelete.bucket}/file/${fileToDelete.fileId}`, {
      method: 'DELETE',
      headers: {
        "Authorization": `Bearer ${token}`,
        "internxt-mnemonic": mnemonic,
        "Content-type": "application/json"
      }
    }).then(async res => {

      return { res, data: await res.json() };

    }).then(res => {
      if (res.res.status == 200) {
        this.props.dispatch(fileActions.getFolderContent(this.props.filesState.folderContent.currentFolder));
        this.modalFile.current.close();
      } else {
        Alert.alert('Error deleting file');
      }
    }).catch(err => {
      console.log(err);
      Alert.alert('Error deleting file');
    });
  }

  closeFileModal = () => {
    if (!this.props.filesState.selectedFile) {
      return;
    }

    const newName = this.state.inputFileName;

    if (!newName) {
      return;
    }

    if (this.props.filesState.selectedFile.name == newName) {
      // Nothing to change.
      return;
    }

    const token = this.props.authenticationState.token;
    const mnemonic = this.props.authenticationState.user.mnemonic;

    fetch(`${process.env.REACT_APP_API_URL}/api/storage/file/${this.props.filesState.selectedFile.fileId}/meta`, {
      method: 'POST',
      headers: {
        "Authorization": `Bearer ${token}`,
        "internxt-mnemonic": mnemonic,
        "Content-type": "application/json"
      },
      body: JSON.stringify({
        metadata: {
          itemName: newName
        }
      })
    }).then(async res => {
      return { res, data: await res.json() };
    }).then(res => {
      if (res.res.status == 200) {
        this.props.dispatch(fileActions.getFolderContent(this.props.filesState.folderContent.currentFolder));
        this.modalFile.current.close();
      } else {
        console.log(res.data);
        Alert.alert('Error renaming file', "Could not rename file");
      }
    }).catch(err => {
      console.log(err);
      Alert.alert('Error renaming file', "Could not rename file");

    });

  }

  closeFolderModal = () => {
    // Check if color or icon was changed an set these changes
    if (this.props.filesState.selectedFile) {
      let metadata = {};
      if (this.state.inputFileName && (this.state.inputFileName !== this.props.filesState.selectedFile.name)) {
        metadata.itemName = this.state.inputFileName;
      }
      if (this.state.selectedColor && (this.state.selectedColor !== this.props.filesState.selectedFile.color)) {
        metadata.color = this.state.selectedColor;
      }
      if (this.state.selectedIcon && (!this.props.filesState.selectedFile.icon || (this.state.selectedIcon !== this.props.filesState.selectedFile.icon.id))) {
        metadata.icon = this.state.selectedIcon;
      }
      // Submit changes
      if (metadata.itemName || metadata.color || metadata.icon) {
        this.props.dispatch(fileActions.updateFolderMetadata(metadata, this.props.filesState.selectedFile.id));
        this.props.dispatch(fileActions.getFolderContent(this.state.folderId));
      }
    }

    this.setState({ selectedColor: '', selectedIcon: '' });
  }

  getItemModal = (item) => {
    let isFolder = item.size == undefined;
    if (isFolder) {
      return this.getFolderModal(item);
    } else {
      return this.getFileModal(item);
    }
  }

  getFileModal = (file) => {
    if (file) {
      return <Modal
        position={"bottom"}
        ref={this.modalFile}
        style={styles.modalSettings}
        onClosed={this.closeFileModal}
        backButtonClose={true}
        backdropPressToClose={true}>
        <View style={styles.drawerKnob}></View>

        <TextInput
          style={{ fontFamily: 'CerebriSans-Bold', fontSize: 20, marginLeft: 26, marginTop: 20 }}
          onChangeText={(value) => { this.setState({ inputFileName: value }) }}
          value={this.state.inputFileName} />

        <Separator />

        <Text style={{ fontFamily: 'CerebriSans-Regular', fontSize: 15, paddingLeft: 24, paddingBottom: 6 }}>
          <Text>Type: </Text>
          <Text style={{ fontFamily: 'CerebriSans-Bold' }}>{file.type ? file.type.toUpperCase() : ''}</Text>
        </Text>

        <Text style={{ fontFamily: 'CerebriSans-Regular', fontSize: 15, paddingLeft: 24, paddingBottom: 6 }}>
          <Text>Added: </Text>
          <Text style={{ fontFamily: 'CerebriSans-Bold' }}><TimeAgo time={file.created_at} /></Text>
        </Text>

        <Text style={{ fontFamily: 'CerebriSans-Regular', fontSize: 15, paddingLeft: 24, paddingBottom: 6 }}>
          <Text>Size: </Text>
          <Text style={{ fontFamily: 'CerebriSans-Bold' }}>{prettysize(file.size)}</Text>
        </Text>

        <Separator />

        <SettingsItem text={<Text style={{ fontFamily: 'CerebriSans-Regular', fontSize: 15, paddingLeft: 24, paddingBottom: 6 }}>
          <Image source={iconDownload} width={24} height={24} />
          <Text style={{ width: 20 }}> </Text>
          <Text style={{ fontFamily: 'CerebriSans-Bold' }}>   Download</Text>
        </Text>} onClick={() => {
          this.props.dispatch(fileActions.downloadSelectedFileStart());
        }} />

        <SettingsItem text={<Text style={{ fontFamily: 'CerebriSans-Regular', fontSize: 15, paddingLeft: 24, paddingBottom: 6 }}>
          <Image source={iconShare} width={24} height={24} />
          <Text style={{ width: 20 }}> </Text>
          <Text style={{ fontFamily: 'CerebriSans-Bold' }}>  Share</Text>
        </Text>} onClick={() => {
          this.modalFile.current.close();
        }} />

        <SettingsItem text={<Text style={{ fontFamily: 'CerebriSans-Regular', fontSize: 15, paddingLeft: 24, paddingBottom: 6 }}>
          <Image source={iconDelete} width={24} height={24} />
          <Text style={{ width: 20 }}> </Text>
          <Text style={{ fontFamily: 'CerebriSans-Bold' }}>   Delete</Text>
        </Text>} onClick={() => {
          this.handleDeleteSelectedFile();
        }} />

      </Modal>;
    } else {
      return <Text></Text>;
    }
  }

  getFolderModal = (folder) => {
    if (folder) {
      return (<Modal
        position={"bottom"}
        ref={this.modalFolder}
        style={styles.modalFolder}
        onClosed={this.closeFolderModal}
        backButtonClose={true}
        backdropPressToClose={true}>
        <View style={styles.drawerKnob}></View>

        <TextInput
          style={{ fontFamily: 'CerebriSans-Bold', fontSize: 20, marginLeft: 26, marginTop: 20 }}
          onChangeText={(value) => { this.setState({ inputFileName: value }) }}
          value={this.state.inputFileName} />

        <Text style={{ fontFamily: 'CerebriSans-Regular', fontSize: 15, paddingLeft: 24, paddingBottom: 6 }}>
          <Text>Type:</Text>
          <Text style={{ fontFamily: 'CerebriSans-Bold' }}> Folder</Text>
        </Text>

        <Separator />

        <Text style={{ fontFamily: 'CerebriSans-Bold', fontSize: 15, paddingLeft: 24, paddingBottom: 13 }}>
          Style Color
          </Text>

        <View style={styles.colorSelection}>
          {
            Object.getOwnPropertyNames(colors).map((value, i) => {
              localColor = this.state.selectedColor ? this.state.selectedColor : (folder ? folder.color : null);
              isSelected = (localColor ? localColor === value : false);
              return (<TouchableHighlight key={i}
                underlayColor={colors[value].darker}
                style={[{ backgroundColor: colors[value].code }, styles.colorButton]}
                onPress={() => { this.setState({ selectedColor: value }) }}>
                {isSelected ? <Icon name="checkmark" width={15} height={15} /> : <Text> </Text>}
              </TouchableHighlight>)
            })
          }
        </View>

        <Separator />

        <Text style={{ fontFamily: 'CerebriSans-Bold', fontSize: 15, paddingLeft: 24, paddingBottom: 13 }}>
          Cover Icon
          </Text>

        <View style={styles.iconSelection}>
          {
            folderIconsList.map((value, i) => {
              localIcon = this.state.selectedIcon ? this.state.selectedIcon : ((folder && folder.icon) ? folder.icon.id : null);
              isSelected = (localIcon ? localIcon - 1 === i : false);
              return (<TouchableHighlight key={i}
                style={styles.iconButton}
                underlayColor="#F2F5FF"
                onPress={() => { this.setState({ selectedIcon: i + 1 }) }}>
                {isSelected ? <Icon name={value} color="#4385F4" style={styles.iconImage} width="30" height="30" /> : <Icon name={value} color={'grey'} style={styles.iconImage} width="30" height="30" />}
              </TouchableHighlight>)
            })
          }
        </View>

      </Modal>
      )
    } else { return; }

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
        {filesState.selectedFile && this.getItemModal(filesState.selectedFile)}
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

        <FileList />
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
  },
  modalFolder: {
    height: hp('90%') < 550 ? 550 : Math.min(600, hp('80%'))
  },
  colorSelection: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginLeft: 15,
    marginRight: 15,
  },
  colorButton: {
    height: 27,
    width: 27,
    borderRadius: 15,
    marginLeft: 9,
    marginRight: 9,
    justifyContent: "center",
    alignItems: "center"
  },
  iconSelection: {
    display: "flex",
    flexWrap: "wrap",
    flexDirection: "row",
    justifyContent: "space-between",
    marginLeft: 15,
    marginRight: 15,
  },
  iconButton: {
    height: 43,
    width: 43,
    margin: hp('90%') < 600 ? 5 : 8,
    justifyContent: "center",
    alignItems: "center"
  },
  iconImage: {
    height: 25,
    width: 25
  }
});

const mapStateToProps = state => {
  return {
    ...state
  };
};

export default (HomeComposed = compose(connect(mapStateToProps))(Home));
