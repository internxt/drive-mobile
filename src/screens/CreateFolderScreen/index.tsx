import React, { useEffect, useState } from 'react';
import { StyleSheet, View, TextInput, KeyboardAvoidingView, Platform, BackHandler } from 'react-native';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useNavigation } from '@react-navigation/native';
import { NavigationStackProp } from 'react-navigation-stack';

import strings from '../../../assets/lang/strings';
import { FolderIcon } from '../../helpers';
import { AppScreenKey } from '../../types';

function CreateFolderScreen(): JSX.Element {
  const navigation = useNavigation<NavigationStackProp>();
  const [folderName, setFolderName] = useState('');

  useEffect(() => {
    const backAction = () => {
      navigation.replace(AppScreenKey.Drive);

      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, []);

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.container}>
      <View style={styles.actionsWrapper}></View>

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

export default CreateFolderScreen;
