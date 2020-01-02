import React, { Component } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  KeyboardAvoidingView,
  ScrollView
} from "react-native";
import { compose } from "redux";
import { connect } from "react-redux";
import { withNavigation } from "react-navigation";
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import MenuItem from "../../components/AppMenu/MenuItem";
import { fileActions } from "../../actions";

class CreateFolder extends Component {
  constructor(props) {
    super(props);

    this.state = {
      value: "Untitled folder",
      parentFolderId: null
    };

    this.onSave = this.onSave.bind(this);
    this.onCancel = this.onCancel.bind(this);
  }

  UNSAFE_componentWillMount() {
    const { navigation } = this.props;
    const parentFolderId = navigation.getParam("parentFolderId", "undefined");

    this.setState({ parentFolderId });
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    // When folderContent is updated with new folder data, go back to Home
    if (nextProps.filesState.folderContent.name === this.state.value) {
      this.props.navigation.navigate("Home", { folderId: nextProps.filesState.folderContent.id });
    }
  }

  onSave() {
    this.props.dispatch(fileActions.createFolder(this.state.parentFolderId, this.state.value));
  }

  onCancel() {
    this.props.navigation.goBack();
  }

  render() {
    const folderIcon = (
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
    );

    return (
      <KeyboardAvoidingView style={styles.container} behavior="padding" enabled>
        <View style={styles.actionsWrapper}>
          <View>
            <MenuItem name="checkmark" onClickHandler={this.onSave} />
          </View>
          <View>
            <MenuItem name="close" onClickHandler={this.onCancel} />
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.folderWrapper}>
          {folderIcon}
          <TextInput
            autoFocus={true}
            style={styles.input}
            value={this.state.value}
            onChangeText={value => this.setState({ value })}
            placeholder={this.state.placeholder}
            placeholderTextColor="#2c6bc9"
            maxLength={24}
            clearTextOnFocus={true}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }
}

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
    textAlign: "center"
  }
});

const mapStateToProps = state => {
  return { ...state };
};

export default (CreateFolderComposed = compose(
  connect(mapStateToProps),
  withNavigation
)(CreateFolder));
