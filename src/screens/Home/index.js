import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  Linking,
  TouchableHighlight,
  Image,
  Alert,
  Keyboard,
  Platform,
  Share
} from 'react-native';
import { compose } from 'redux';
import { connect } from 'react-redux';
import Modal from 'react-native-modalbox';
import prettysize from 'prettysize';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp
} from 'react-native-responsive-screen';
import TimeAgo from 'react-native-timeago';

import AppMenu from '../../components/AppMenu';
import FileList from '../../components/FileList';
import MoveList from '../../components/MoveList';
import ButtonPreviousDir from '../../components/ButtonPreviousDir';
import ProgressBar from '../../components/ProgressBar';
import Separator from '../../components/Separator';
import SettingsItem from '../../components/SettingsItem';
import { colors, folderIconsList, sortTypes } from '../../constants';
import Icon from '../../../assets/icons/Icon';
import { fileActions, layoutActions, userActions } from '../../actions';
import { getIcon, utils, getHeaders } from '../../helpers';

const iconDownload = getIcon('download');
const iconDelete = getIcon('delete');
const iconShare = getIcon('share');
const iconMove = getIcon('move');

class Home extends Component {
  constructor(props) {
    super(props);

    this.state = {
      folderId: null,
      folderName: 'Home',
      backButtonVisible: false,
      token: '',
      user: {},
      selectedColor: '',
      selectedIcon: '',
      inputFileName: '',
      usage: {
        used: 0,
        maxLimit: 1024 * 1024 * 1024 * 2
      },
      keyboardSpace: 0
    };

    // to get keyboard height
    Keyboard.addListener('keyboardDidShow', frames => {
      if (!frames.endCoordinates) return;
      this.setState({ keyboardSpace: frames.endCoordinates.height });
    });
    Keyboard.addListener('keyboardDidHide', frames => {
      this.setState({ keyboardSpace: 0 });
    });

    this.modalItem = React.createRef();
    this.modalSort = React.createRef();
    this.modalMoveFiles = React.createRef();
    this.modalDeleteFiles = React.createRef();
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    // Manage showing settings modal
    if (nextProps.layoutState.showSettingsModal) {
      this.refs.modalSettings.open();
      this.props.dispatch(layoutActions.closeSettings());
    }

    // Manage showing item modal
    if (nextProps.layoutState.showItemModal) {
      this.modalItem.current.open();
      this.props.dispatch(layoutActions.closeItemModal());
    }

    // Manage showing sort modal
    if (nextProps.layoutState.showSortModal) {
      this.modalSort.current.open();
      this.props.dispatch(layoutActions.closeSortModal());
    }

    // Manage showing moveFiles modal
    if (nextProps.layoutState.showMoveFilesModal) {
      this.modalMoveFiles.current.open();
      this.props.dispatch(layoutActions.closeMoveFilesModal());
    }

    // Set folder/file name if is selected
    if (nextProps.filesState.selectedFile) {
      this.setState({ inputFileName: nextProps.filesState.selectedFile.name });
    }

    const folderId = parseInt(
      nextProps.navigation.getParam('folderId', 'undefined')
    );
    const { token, user } = this.props.authenticationState;

    // If logged out
    if (nextProps.authenticationState.loggedIn === false) {
      this.props.navigation.replace('Auth');
    }

    if (nextProps.layoutState.showRunOutSpaceModal) {
      this.props.dispatch(layoutActions.closeRunOutStorageModal());
      this.refs.runOutStorageModal.open();
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

  getFileToken = async item => {
    try {
      const fileId = item
        ? item.fileId
        : this.props.filesState.selectedFile.fileId;
      const token = this.props.authenticationState.token;
      const mnemonic = this.props.authenticationState.user.mnemonic;

      const headers = {
        Authorization: `Bearer ${token}`,
        'internxt-mnemonic': mnemonic,
        'Content-type': 'application/json'
      };

      // Generate token
      const res = await fetch(
        `${(process && process.env && process.env.REACT_APP_API_URL) ||
          'https://drive.internxt.com'}/api/storage/share/file/${fileId}`,
        {
          method: 'POST',
          headers: getHeaders(
            this.props.authenticationState.token,
            this.props.authenticationState.user.mnemonic
          )
        }
      );
      const data = await res.json();

      if (res.status != 200) {
        const errMsg = data.error ? data.error : 'Cannot download file';
        Alert.alert('Error', errMsg);
      } else {
        return data.token;
      }
    } catch (error) {
      console.log(`Error getting file token: ${error}`);
      Alert.alert('Error', 'Error getting file from server');
    }
  };

  downloadFile = async item => {
    // Get file token
    const linkToken = await this.getFileToken(item);
    // Open file on browser
    Linking.openURL(
      `${process &&
        process.env &&
        process.env.REACT_APP_PROXY_URL}/${(process &&
        process.env &&
        process.env.REACT_APP_API_URL) ||
        'https://drive.internxt.com'}/api/storage/share/${linkToken}`
    );
  };

  shareFile = async item => {
    // Get file token
    const linkToken = await this.getFileToken(item);
    const url = `${process &&
      process.env &&
      process.env.REACT_APP_PROXY_URL}/${(process &&
      process.env &&
      process.env.REACT_APP_API_URL) ||
      'https://drive.internxt.com'}/api/storage/share/${linkToken}`;

    const shortedUrl = await utils.shortUrl(url);

    // Share link on native share system
    await Share.share({
      title: 'Internxt Drive file sharing',
      message: `Hello, \nHow are things going? I’m using Internxt Drive, a secure, simple, private and eco-friendly cloud storage service https://internxt.com/drive \n\nI wanted to share a file (${item.name}) with you through this single-use private link -no sign up required: ${shortedUrl}`
    });
  };

  handleDeleteSelectedItems() {
    const itemsToDelete = this.props.filesState.selectedItems;
    this.props.dispatch(
      fileActions.deleteItems(
        itemsToDelete,
        this.props.filesState.folderContent.currentFolder
      )
    );
  }

  openDeleteSelectedItemsComfirmation() {
    this.modalDeleteFiles.current.open();
  }

  handleDeleteSelectedItem() {
    const itemToDelete = this.props.filesState.selectedFile;
    const token = this.props.authenticationState.token;
    const mnemonic = this.props.authenticationState.user.mnemonic;
    const isFolder = !(itemToDelete.size && itemToDelete.size >= 0);
    const url = isFolder
      ? `${(process && process.env && process.env.REACT_APP_API_URL) ||
          'https://drive.internxt.com'}/api/storage/folder/${itemToDelete.id}`
      : `${(process && process.env && process.env.REACT_APP_API_URL) ||
          'https://drive.internxt.com'}/api/storage/bucket/${
          itemToDelete.bucket
        }/file/${itemToDelete.fileId}`;

    fetch(url, {
      method: 'DELETE',
      headers: getHeaders(true, true)
    })
      .then(res => {
        // Manage file (200) and folder (204) deletion response
        if (res.status == 200 || res.status == 204) {
          // Wait 1 sec for update content
          setTimeout(() => {
            this.props.dispatch(
              fileActions.getFolderContent(
                this.props.filesState.folderContent.currentFolder
              )
            );
            // Close modal
            this.modalItem.current.close();
          }, 1000);
        } else {
          Alert.alert('Error deleting item');
        }
      })
      .catch(err => {
        console.log('handleDeleteSelectedItem', err);
        Alert.alert('Error deleting item');
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

    fetch(
      `${(process && process.env && process.env.REACT_APP_API_URL) ||
        'https://drive.internxt.com'}/api/storage/file/${
        this.props.filesState.selectedFile.fileId
      }/meta`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'internxt-mnemonic': mnemonic,
          'Content-type': 'application/json'
        },
        body: JSON.stringify({
          metadata: {
            itemName: newName
          }
        })
      }
    )
      .then(async res => {
        return { res, data: await res.json() };
      })
      .then(res => {
        if (res.res.status == 200) {
          this.props.dispatch(
            fileActions.getFolderContent(
              this.props.filesState.folderContent.currentFolder
            )
          );
          this.modalItem.current.close();
        } else {
          console.log(res.data);
          Alert.alert('Error renaming file', 'Could not rename file');
        }
      })
      .catch(err => {
        console.log('closeFileModal', err);
        Alert.alert('Error renaming file', 'Could not rename file');
      });
  };

  closeFolderModal = () => {
    // Check if color or icon was changed an set these changes
    if (this.props.filesState.selectedFile) {
      let metadata = {};
      if (
        this.state.inputFileName &&
        this.state.inputFileName !== this.props.filesState.selectedFile.name
      ) {
        metadata.itemName = this.state.inputFileName;
      }
      if (
        this.state.selectedColor &&
        this.state.selectedColor !== this.props.filesState.selectedFile.color
      ) {
        metadata.color = this.state.selectedColor;
      }
      if (
        typeof this.state.selectedIcon === 'number' &&
        this.state.selectedIcon >= 0 &&
        (!this.props.filesState.selectedFile.icon ||
          this.state.selectedIcon !==
            this.props.filesState.selectedFile.icon.id)
      ) {
        metadata.icon = this.state.selectedIcon;
      }
      // Submit changes
      if (metadata.itemName || metadata.color || metadata.icon >= 0) {
        this.props.dispatch(
          fileActions.updateFolderMetadata(
            metadata,
            this.props.filesState.selectedFile.id
          )
        );
        setTimeout(() => {
          this.props.dispatch(
            fileActions.getFolderContent(
              this.props.filesState.folderContent.currentFolder
            )
          );
        }, 400);
      }
    }

    this.setState({ selectedColor: '', selectedIcon: '' });
  };

  closeMoveFilesModal = result => {
    // When modal is closed by move action result = folder id otherwise ans = -1
    if (result >= 0 && this.props.filesState.selectedFile) {
      this.props.dispatch(
        fileActions.moveFile(this.props.filesState.selectedFile.fileId, result)
      );
      setTimeout(() => {
        this.props.dispatch(
          fileActions.getFolderContent(
            this.props.filesState.folderContent.currentFolder
          )
        );
      }, 400);
    }
    this.modalMoveFiles.current.close();
    this.modalItem.current.close();
  };

  closeDeleteItemsModal = result => {
    this.modalDeleteFiles.current.close();
  };

  getItemModal = () => {
    const item = this.props.filesState.selectedFile;
    let isFolder = item && item.size == undefined;
    if (isFolder) {
      return this.getFolderModal(item);
    } else {
      return this.getFileModal(item);
    }
  };

  getFileModal = file => {
    return (
      <Modal
        position={'bottom'}
        ref={this.modalItem}
        style={[
          styles.modalSettingsFile,
          {
            top:
              this.state.keyboardSpace && Platform.OS !== 'ios'
                ? 150 - this.state.keyboardSpace
                : 0
          }
        ]}
        onClosed={this.closeFileModal}
        backButtonClose={true}
        backdropPressToClose={true}
        animationDuration={200}
      >
        <View style={styles.drawerKnob}></View>

        <TextInput
          style={{
            fontFamily: 'CerebriSans-Bold',
            fontSize: 20,
            marginLeft: 26,
            marginTop: 20
          }}
          onChangeText={value => {
            this.setState({ inputFileName: value });
          }}
          value={this.state.inputFileName}
        />

        <Separator />

        <Text
          style={{
            fontFamily: 'CerebriSans-Regular',
            fontSize: 15,
            paddingLeft: 24,
            paddingBottom: 6
          }}
        >
          <Text>Type: </Text>
          <Text style={{ fontFamily: 'CerebriSans-Bold' }}>
            {file && file.type ? file.type.toUpperCase() : ''}
          </Text>
        </Text>

        <Text
          style={{
            fontFamily: 'CerebriSans-Regular',
            fontSize: 15,
            paddingLeft: 24,
            paddingBottom: 6
          }}
        >
          <Text>Added: </Text>
          <Text style={{ fontFamily: 'CerebriSans-Bold' }}>
            {file ? <TimeAgo time={file.created_at} /> : ''}
          </Text>
        </Text>

        <Text
          style={{
            fontFamily: 'CerebriSans-Regular',
            fontSize: 15,
            paddingLeft: 24,
            paddingBottom: 6
          }}
        >
          <Text>Size: </Text>
          <Text style={{ fontFamily: 'CerebriSans-Bold' }}>
            {file ? prettysize(file.size) : ''}
          </Text>
        </Text>

        <Separator />

        <SettingsItem
          text={
            <Text style={styles.modalFileItemContainer}>
              <Image source={iconDownload} style={{ width: 19, height: 21 }} />
              <Text style={{ width: 20 }}> </Text>
              <Text style={{ fontFamily: 'CerebriSans-Bold' }}> Download</Text>
            </Text>
          }
          onClick={() => {
            this.props.dispatch(fileActions.downloadSelectedFileStart());
          }}
        />

        <SettingsItem
          text={
            <Text style={styles.modalFileItemContainer}>
              <Image source={iconMove} style={{ width: 20, height: 20 }} />
              <Text style={{ width: 20 }}> </Text>
              <Text style={{ fontFamily: 'CerebriSans-Bold' }}> Move</Text>
            </Text>
          }
          onClick={() => {
            this.props.dispatch(layoutActions.openMoveFilesModal());
          }}
        />

        <SettingsItem
          text={
            <Text style={styles.modalFileItemContainer}>
              <Image source={iconShare} style={{ width: 20, height: 14 }} />
              <Text style={{ width: 20 }}> </Text>
              <Text style={{ fontFamily: 'CerebriSans-Bold' }}> Share</Text>
            </Text>
          }
          onClick={() => {
            this.shareFile(this.props.filesState.selectedFile);
          }}
        />

        <SettingsItem
          text={
            <Text style={styles.modalFileItemContainer}>
              <Image source={iconDelete} style={{ width: 16, height: 21 }} />
              <Text style={{ width: 20 }}> </Text>
              <Text style={{ fontFamily: 'CerebriSans-Bold' }}> Delete</Text>
            </Text>
          }
          onClick={() => {
            this.modalDeleteFiles.current.open();
            this.modalItem.current.close();
          }}
        />
      </Modal>
    );
  };

  getFolderModal = folder => {
    if (folder) {
      return (
        <Modal
          position={'bottom'}
          ref={this.modalItem}
          style={styles.modalFolder}
          onClosed={this.closeFolderModal}
          backButtonClose={true}
          animationDuration={200}
        >
          <View style={styles.drawerKnob}></View>

          <View style={{ flexDirection: 'row', paddingRight: 22 }}>
            <TextInput
              style={{
                fontFamily: 'CerebriSans-Bold',
                fontSize: 20,
                marginLeft: 26,
                flex: 1
              }}
              onChangeText={value => {
                this.setState({ inputFileName: value });
              }}
              value={this.state.inputFileName}
            />
          </View>

          <Separator />

          <Text
            style={{
              fontFamily: 'CerebriSans-Bold',
              fontSize: 15,
              paddingLeft: 24,
              paddingBottom: 13
            }}
          >
            Style Color
          </Text>

          <View style={styles.colorSelection}>
            {Object.getOwnPropertyNames(colors).map((value, i) => {
              let localColor = this.state.selectedColor
                ? this.state.selectedColor
                : folder
                ? folder.color
                : null;
              let isSelected = localColor ? localColor === value : false;
              return (
                <TouchableHighlight
                  key={i}
                  underlayColor={colors[value].darker}
                  style={[
                    { backgroundColor: colors[value].code },
                    styles.colorButton
                  ]}
                  onPress={() => {
                    this.setState({ selectedColor: value });
                  }}
                >
                  {isSelected ? (
                    <Icon name="checkmark" width={15} height={15} />
                  ) : (
                    <Text> </Text>
                  )}
                </TouchableHighlight>
              );
            })}
          </View>

          <Separator />

          <Text
            style={{
              fontFamily: 'CerebriSans-Bold',
              fontSize: 15,
              paddingLeft: 24,
              paddingBottom: 13
            }}
          >
            Cover Icon
          </Text>

          <View style={styles.iconSelection} key={this.state.selectedIcon}>
            {folderIconsList.map((value, i) => {
              let localIcon =
                typeof this.state.selectedIcon === 'number' &&
                this.state.selectedIcon >= 0
                  ? this.state.selectedIcon
                  : folder && folder.icon
                  ? folder.icon.id
                  : null;
              let isSelected = localIcon ? localIcon - 1 === i : false;
              let iconValue = isSelected ? 0 : i + 1;

              return (
                <TouchableHighlight
                  key={i}
                  style={styles.iconButton}
                  underlayColor="#F2F5FF"
                  onPress={() => {
                    console.log(iconValue);
                    this.setState({ selectedIcon: iconValue });
                  }}
                >
                  <Icon
                    name={value}
                    color={isSelected ? '#4385F4' : 'grey'}
                    width={30}
                    height={30}
                    style={styles.iconImage}
                  />
                </TouchableHighlight>
              );
            })}
          </View>
        </Modal>
      );
    }
  };

  getSortModal = () => {
    return (
      <Modal
        position={'bottom'}
        ref={this.modalSort}
        style={{ height: 240 }}
        backButtonClose={true}
        backdropPressToClose={true}
        animationDuration={200}
      >
        <View style={styles.drawerKnob}></View>

        <Text
          style={
            this.props.filesState.sortType === sortTypes.DATE_ADDED ||
            this.props.filesState.sortType === ''
              ? styles.sortOptionSelected
              : styles.sortOption
          }
          onPress={() => {
            this.props.dispatch(
              fileActions.setSortFunction(sortTypes.DATE_ADDED)
            );
          }}
        >
          Date Added
        </Text>
        <Text
          style={
            this.props.filesState.sortType === sortTypes.SIZE_ASC
              ? styles.sortOptionSelected
              : styles.sortOption
          }
          onPress={() => {
            this.props.dispatch(
              fileActions.setSortFunction(sortTypes.SIZE_ASC)
            );
          }}
        >
          Size
        </Text>
        <Text
          style={
            this.props.filesState.sortType === sortTypes.NAME_ASC
              ? styles.sortOptionSelected
              : styles.sortOption
          }
          onPress={() => {
            this.props.dispatch(
              fileActions.setSortFunction(sortTypes.NAME_ASC)
            );
          }}
        >
          Name
        </Text>
        <Text
          style={
            this.props.filesState.sortType === sortTypes.FILETYPE_ASC
              ? styles.sortOptionSelected
              : styles.sortOption
          }
          onPress={() => {
            this.props.dispatch(
              fileActions.setSortFunction(sortTypes.FILETYPE_ASC)
            );
          }}
        >
          File Type
        </Text>
      </Modal>
    );
  };

  getMoveFilesModal = () => {
    return (
      <Modal
        ref={this.modalMoveFiles}
        style={styles.modalMoveFiles}
        swipeToClose={false}
        backButtonClose={true}
        backdropPressToClose={false}
        animationDuration={200}
      >
        <Text
          style={{
            fontFamily: 'CerebriSans-Bold',
            fontSize: 18,
            marginTop: 25,
            marginBottom: 18,
            marginLeft: 10
          }}
        >
          Choose a folder to move this file.
        </Text>
        <MoveList
          style={{ height: hp('83%') }}
          folderId={this.state.folderId}
          folders={
            this.props.filesState.folderContent
              ? this.props.filesState.folderContent.children
              : null
          }
          onMoveFile={this.closeMoveFilesModal}
        />
      </Modal>
    );
  };

  getDeleteItemsModal = () => {
    const multipleFiles = this.props.filesState.selectedItems.length > 1;
    return (
      <Modal ref={this.modalDeleteFiles} style={{ padding: 24 }}>
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <View>
            <Image
              source={require('../../../assets/images/logo.png')}
              style={{ width: 55, height: 29, marginBottom: 22 }}
            />
            <Text style={{ fontSize: 27, fontFamily: 'CircularStd-Bold' }}>
              Delete item{multipleFiles ? 's' : ''}.
            </Text>
            <Text style={{ fontSize: 17, color: '#737880', marginTop: 15 }}>
              Please confirm you want to delete this item
              {multipleFiles ? 's' : ''}. This action can’t be undone.
            </Text>

            <View style={{ flexDirection: 'row', marginTop: 40 }}>
              <TouchableHighlight
                style={{
                  height: 60,
                  borderRadius: 4,
                  borderWidth: 2,
                  backgroundColor: '#fff',
                  borderColor: 'rgba(151, 151, 151, 0.2)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: '45%'
                }}
                onPress={() => {
                  this.closeDeleteItemsModal();
                }}
              >
                <Text
                  style={{
                    color: '#5c6066',
                    fontFamily: 'CerebriSans-Bold',
                    fontSize: 16
                  }}
                >
                  Cancel
                </Text>
              </TouchableHighlight>

              <TouchableHighlight
                style={{
                  height: 60,
                  borderRadius: 4,
                  borderWidth: 2,
                  backgroundColor: '#4585f5',
                  borderColor: 'rgba(151, 151, 151, 0.2)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginLeft: 20,
                  width: '45%'
                }}
                onPress={() => {
                  this.handleDeleteSelectedItems();
                  this.closeDeleteItemsModal();
                }}
              >
                <Text
                  style={{
                    color: '#fff',
                    fontFamily: 'CerebriSans-Bold',
                    fontSize: 16
                  }}
                >
                  Confirm
                </Text>
              </TouchableHighlight>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  loadUsage = () => {
    fetch(
      `${(process && process.env && process.env.REACT_APP_API_URL) ||
        'https://drive.internxt.com'}/api/limit`,
      {
        method: 'get',
        headers: getHeaders(this.props.authenticationState.token)
      }
    )
      .then(res => res.json())
      .then(res => {
        var copyUsage = this.state.usage;
        copyUsage.maxLimit = res.maxSpaceBytes;
        this.setState({ usage: copyUsage });
      })
      .catch(err => {
        console.log('loadUsage 1', err);
      });

    fetch(
      `${(process && process.env && process.env.REACT_APP_API_URL) ||
        'https://drive.internxt.com'}/api/usage`,
      {
        method: 'get',
        headers: getHeaders(this.props.authenticationState.token)
      }
    )
      .then(res => res.json())
      .then(res => {
        var copyUsage = this.state.usage;
        copyUsage.used = res.total;
        this.setState({ usage: copyUsage });
      })
      .catch(err => {
        console.log('loadUsage 2', err);
      });
  };

  render() {
    const { navigation, filesState } = this.props;

    const ProgressBarStyle = {
      height: 6,
      marginLeft: 26,
      marginRight: 26,
      marginTop: 18,
      marginBottom: 23,
      borderRadius: 1.3
    };

    const self = this;

    return (
      <View style={styles.container}>
        <Modal ref={'runOutStorageModal'} style={{ padding: 24 }}>
          <View
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
          >
            <View>
              <Image
                source={require('../../../assets/images/logo.png')}
                style={{ width: 55, height: 29, marginBottom: 22 }}
              />
              <Text style={{ fontSize: 27, fontFamily: 'CircularStd-Bold' }}>
                Ran out of space.
              </Text>
              <Text style={{ fontSize: 17, color: '#737880', marginTop: 15 }}>
                In order to start uploading more files please access Internxt
                Drive on your computer and upgrade your storage plan.
              </Text>

              <View style={{ flexDirection: 'row', marginTop: 40 }}>
                <TouchableHighlight
                  style={{
                    height: 60,
                    borderRadius: 4,
                    borderWidth: 2,
                    backgroundColor: '#fff',
                    borderColor: 'rgba(151, 151, 151, 0.2)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '45%'
                  }}
                  onPress={() => {
                    self.refs.runOutStorageModal.close();
                  }}
                >
                  <Text
                    style={{
                      color: '#5c6066',
                      fontFamily: 'CerebriSans-Bold',
                      fontSize: 16
                    }}
                  >
                    Close
                  </Text>
                </TouchableHighlight>
              </View>
            </View>
          </View>
        </Modal>
        {this.getItemModal()}
        {this.getSortModal()}
        {this.getMoveFilesModal()}
        {this.getDeleteItemsModal()}
        <Modal
          position={'bottom'}
          ref={'modalSettings'}
          style={styles.modalSettings}
          onOpened={this.loadUsage}
          backButtonClose={true}
          animationDuration={200}
        >
          <View style={styles.drawerKnob}></View>

          <Text
            style={{
              fontSize: 20,
              fontWeight: 'bold',
              marginLeft: 26,
              marginTop: 17,
              fontFamily: 'CerebriSans-Bold'
            }}
          >
            {this.props.authenticationState.user.name}{' '}
            {this.props.authenticationState.user.lastname}
          </Text>

          <ProgressBar
            styleBar={ProgressBarStyle}
            styleProgress={{ height: 6 }}
            totalValue={this.state.usage.maxLimit}
            usedValue={this.state.usage.used}
          />

          <Text
            style={{
              fontFamily: 'CerebriSans-Regular',
              fontSize: 15,
              paddingLeft: 24,
              paddingBottom: 13
            }}
          >
            <Text>Used</Text>
            <Text style={{ fontWeight: 'bold' }}>
              {' '}
              {prettysize(this.state.usage.used)}{' '}
            </Text>
            <Text>of</Text>
            <Text style={{ fontWeight: 'bold' }}>
              {' '}
              {prettysize(this.state.usage.maxLimit)}{' '}
            </Text>
          </Text>

          <Separator />
          <SettingsItem
            text="More info"
            onClick={() => Linking.openURL('https://internxt.com/drive')}
          />
          <SettingsItem
            text="Contact"
            onClick={() => Linking.openURL('mailto:hello@internxt.com')}
          />
          <SettingsItem
            text="Sign out"
            onClick={() => this.props.dispatch(userActions.signout())}
          />
        </Modal>

        <View style={{ height: 17.5 }}></View>

        <AppMenu
          navigation={navigation}
          downloadFile={this.downloadFile}
          deleteItems={this.openDeleteSelectedItemsComfirmation.bind(this)}
        />

        <View style={styles.breadcrumbs}>
          <Text style={styles.breadcrumbsTitle}>
            {filesState.folderContent && filesState.folderContent.parentId
              ? filesState.folderContent.name
              : 'All Files'}
          </Text>
          {this.state.backButtonVisible && <ButtonPreviousDir />}
        </View>

        <FileList downloadFile={this.downloadFile} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    backgroundColor: '#fff'
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
    display: 'flex',
    flexWrap: 'nowrap',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomColor: '#e6e6e6',
    borderBottomWidth: 1,
    marginTop: 15,
    paddingBottom: 15
  },
  breadcrumbsTitle: {
    fontFamily: 'CircularStd-Bold',
    fontSize: 21,
    letterSpacing: -0.2,
    paddingLeft: 20,
    color: '#000000'
  },
  modalSettings: {
    height: 350
  },
  modalSettingsFile: {
    height: 420
  },
  modalSettingsProgressBar: {
    height: 6.5,
    marginLeft: 24,
    marginRight: 24
  },
  modalMoveFiles: {
    //height: hp('90%'),
    //width: wp('90%'),
    justifyContent: 'flex-start',
    paddingTop: 30
  },
  sortOption: {
    fontFamily: 'CerebriSans-Bold',
    fontSize: 18,
    paddingTop: 13,
    paddingBottom: 13,
    paddingLeft: 28
  },
  sortOptionSelected: {
    fontFamily: 'CerebriSans-Bold',
    fontSize: 18,
    color: '#0054ff',
    paddingTop: 13,
    paddingBottom: 13,
    paddingLeft: 28
  },
  modalFolder: {
    height: hp('90%') < 550 ? 550 : Math.min(600, hp('90%'))
  },
  colorSelection: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 15,
    marginRight: 15
  },
  colorButton: {
    height: 27,
    width: 27,
    borderRadius: 15,
    marginLeft: 9,
    marginRight: 9,
    justifyContent: 'center',
    alignItems: 'center'
  },
  iconSelection: {
    display: 'flex',
    flexWrap: 'wrap',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 15,
    marginRight: 15
  },
  iconButton: {
    height: 43,
    width: 43,
    margin: hp('90%') < 600 ? 5 : 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  iconImage: {
    height: 25,
    width: 25
  },
  modalFileItemContainer: {
    fontFamily: 'CerebriSans-Regular',
    fontSize: 15,
    paddingLeft: 24,
    paddingBottom: 6,
    justifyContent: 'center'
  },
  modalFileItemIcon: {},
  modalFileItemText: {}
});

const mapStateToProps = state => {
  return {
    ...state
  };
};

export default HomeComposed = compose(connect(mapStateToProps))(Home);
