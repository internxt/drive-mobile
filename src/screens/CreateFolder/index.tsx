import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  KeyboardAvoidingView,
  ScrollView
} from "react-native";
import { connect } from "react-redux";
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import MenuItem from "../../components/MenuItem";
import { fileActions } from "../../redux/actions";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";

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

function CreateFolder(props: any) {
    const [ foldername, setFolderName ] = useState("")
    const [ parentfolderid, setParentFolderId ] = useState(0)
    const currentFolderId = props.filesState.folderContent && props.filesState.folderContent.currentFolder

    useEffect(() => {
        setParentFolderId(props.navigation.getParam("parentFolderId", "undefined"))
        console.log('---------- PARENT FOLDER ID ----------', parentfolderid)
/*         if (props.fileState.folderContent.name === foldername) {
            props.navigation.navigate("Home", { folderId: props.fileState.folderContent.id })
        } */
    }, [])

    const onSave = () => {
      if (foldername) {

        const rootFolder = props.authenticationState.user.root_folder_id
        props.dispatch(fileActions.createFolder(currentFolderId || rootFolder, foldername))
      }
      props.navigation.replace("FileExplorer")
    }

    const onCancel = () => {
        props.navigation.replace("FileExplorer")
    }

    return (
        <KeyboardAvoidingView style={styles.container} enabled>
            <View style={styles.actionsWrapper}>
                <View>
                    <MenuItem name="close" onClickHandler={ () => onCancel() } />
                </View>

                <View>
                    <MenuItem name="checkmark" onClickHandler={() => onSave() } />
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.folderWrapper}>
                <FolderIcon />

                <TextInput
                    selectTextOnFocus={true}
                    autoFocus={true}
                    style={styles.input}
                    value={foldername}
                    onChangeText={e => setFolderName(e)}
                    placeholder="Enter folder name"
                    placeholderTextColor="rgba(44, 107, 201, 0.5)"
                    maxLength={24}
                    clearTextOnFocus={true}
                />
            </ScrollView>
        </KeyboardAvoidingView>
    )
}

/* class CreateFolder2 extends Component {
  componentWillReceiveProps(nextProps) {
    // When folderContent is updated with new folder data, go back to Home
    if (nextProps.filesState.folderContent.name === this.state.value) {
      this.props.navigation.navigate("Home", { folderId: nextProps.filesState.folderContent.id });
    }
  }
} */

const styles = StyleSheet.create({
  container: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
    alignItems: "stretch",
    backgroundColor: "#fff"
  },
  actionsWrapper: {
    height: 51,
    marginTop: 35,
    paddingLeft: 20,
    paddingRight: 20,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignSelf: "stretch"
  },
  folderWrapper: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center"
  },
  icon: {
    width: 219,
    height: 172,
    marginBottom: 20
  },
  input: {
    fontFamily: "CircularStd-Bold",
    letterSpacing: -0.2,
    fontSize: 23,
    color: "#2c6bc9",
    width: 219,
    textAlign: "left",
    marginLeft: wp(5)
  }
});

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(CreateFolder)