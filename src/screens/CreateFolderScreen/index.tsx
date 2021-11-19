import React, { useEffect, useState } from 'react';
import { StyleSheet, View, TextInput, KeyboardAvoidingView, Platform, BackHandler } from 'react-native';
import { connect } from 'react-redux';
import { fileActions } from '../../store/actions';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import strings from '../../../assets/lang/strings';
import { FolderIcon } from '../../helpers';

function CreateFolderScreen(props: any): JSX.Element {
  const [folderName, setFolderName] = useState('');
  const currentFolderId = props.filesState.folderContent && props.filesState.folderContent.currentFolder;

  useEffect(() => {
    // BackHandler
    const backAction = () => {
      props.navigation.replace('FileExplorer');

      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, []);

  const onSave = () => {
    if (folderName) {
      const rootFolder = props.authenticationState.user.root_folder_id;

      props.dispatch(fileActions.createFolder(currentFolderId || rootFolder, folderName));
    }
    props.navigation.replace('FileExplorer');
  };

  const onCancel = () => {
    props.navigation.replace('FileExplorer');
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.container}>
      <View style={styles.actionsWrapper}>
        <View>{/* <MenuItem name="close" onClickHandler={() => onCancel()} /> */}</View>

        <View>{/* <MenuItem name="checkmark" onClickHandler={() => onSave()} /> */}</View>
      </View>

      <View style={styles.folderWrapper}>
        <FolderIcon />

        <TextInput
          selectTextOnFocus={true}
          autoFocus={true}
          style={styles.input}
          value={folderName}
          onChangeText={(e) => setFolderName(e)}
          placeholder={strings.screens.create_folder.input}
          placeholderTextColor="rgba(44, 107, 201, 0.5)"
          maxLength={24}
          clearTextOnFocus={true}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  actionsWrapper: {
    alignSelf: 'stretch',
    display: 'flex',
    flexDirection: 'row',
    height: 51,
    justifyContent: 'space-between',
    marginTop: Platform.select({ ios: 45, android: 20 }),
    paddingLeft: 20,
    paddingRight: 20,
  },
  container: {
    alignItems: 'stretch',
    backgroundColor: '#fff',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  folderWrapper: {
    alignItems: 'center',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  input: {
    color: '#2c6bc9',
    fontFamily: 'NeueEinstellung-Bold',
    fontSize: 23,
    letterSpacing: -0.2,
    marginLeft: wp(5),
    textAlign: 'left',
    width: 230,
  },
});

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(CreateFolderScreen);
