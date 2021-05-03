import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  BackHandler
} from 'react-native';
import { connect } from 'react-redux';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import MenuItem from '../../components/MenuItem';
import { fileActions } from '../../redux/actions';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import strings from '../../../assets/lang/strings';

const FolderIcon = () => (
  <Svg style={styles.icon} viewBox="0 0 99 78">
    <Defs>
      <LinearGradient
        id="folder-gradient"
        x1="50%"
        x2="50%"
        y1="0%"
        y2="100%"
      >
        <Stop stopColor="#b3d1ff" offset="0%" />
        <Stop stopColor="#87b7ff" offset="100%" />
      </LinearGradient>
    </Defs>
    <Path
      fill="url(#folder-gradient)"
      fill-rule="evenodd"
      d="M838.669178,104.684932 C841.426247,104.684932 843.663493,106.91749 843.663493,109.671491 L843.663493,140.305284 L843.663493,171.355863 C843.663493,172.9616 842.359436,174.264721 840.750801,174.264721 L747.912692,174.264721 C746.306358,174.264721 745,172.962381 745,171.355863 L745,140.305284 L745,109.671491 C745,109.560796 745.003606,109.450949 745.010708,109.342062 C745.003606,109.233251 745,109.123489 745,109.012885 L745,101.985105 C745,99.2309234 747.236317,97 749.994954,97 L772.892877,97 C774.896915,97 776.623884,98.1764588 777.419754,99.8747346 C777.421541,99.8610064 778.263176,101.332648 778.633429,101.826292 C779.056431,102.390265 779.020516,102.478345 779.760343,103.182973 C780.575974,103.9598 780.776343,104.042126 781.151796,104.227487 C781.303355,104.302311 781.609433,104.474789 782.094499,104.556078 C782.570567,104.635858 783.142944,104.670599 783.473539,104.684932 L838.669178,104.684932 Z"
      transform="translate(-745 -97)"
    />
  </Svg>
)

function CreateFolder(props: any): JSX.Element {
  const [folderName, setFolderName] = useState('')
  const currentFolderId = props.filesState.folderContent && props.filesState.folderContent.currentFolder

  useEffect(() => {
    // BackHandler
    const backAction = () => {
      props.navigation.replace('FileExplorer')

      return true
    }
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction)

    return () => backHandler.remove()
  }, [])

  const onSave = () => {
    if (folderName) {
      const rootFolder = props.authenticationState.user.root_folder_id

      props.dispatch(fileActions.createFolder(currentFolderId || rootFolder, folderName))
    }
    props.navigation.replace('FileExplorer')
  }

  const onCancel = () => {
    props.navigation.replace('FileExplorer')
  }

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={styles.container}>
      <View style={styles.actionsWrapper}>
        <View>
          <MenuItem name="close" onClickHandler={() => onCancel()} />
        </View>

        <View>
          <MenuItem name="checkmark" onClickHandler={() => onSave()} />
        </View>
      </View>

      <View style={styles.folderWrapper}>
        <FolderIcon />

        <TextInput
          selectTextOnFocus={true}
          autoFocus={true}
          style={styles.input}
          value={folderName}
          onChangeText={e => setFolderName(e)}
          placeholder={strings.screens.create_folder.input}
          placeholderTextColor="rgba(44, 107, 201, 0.5)"
          maxLength={24}
          clearTextOnFocus={true}
        />
      </View>
    </KeyboardAvoidingView>
  )
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
    paddingRight: 20
  },
  container: {
    alignItems: 'stretch',
    backgroundColor: '#fff',
    display: 'flex',
    flexDirection: 'column',
    height: '100%'
  },
  folderWrapper: {
    alignItems: 'center',
    flexDirection: 'column',
    justifyContent: 'center'
  },
  icon: {
    height: 172,
    marginBottom: 15,
    marginTop: 15,
    width: 219
  },
  input: {
    color: '#2c6bc9',
    fontFamily: 'CircularStd-Bold',
    fontSize: 23,
    letterSpacing: -0.2,
    marginLeft: wp(5),
    textAlign: 'left',
    width: 230
  }
});

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(CreateFolder)