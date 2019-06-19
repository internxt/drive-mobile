import React, { Component, Fragment } from "react";
import { compose } from "redux";
import { connect } from "react-redux";
import {
  StyleSheet,
  View,
  Text,
  TouchableHighlight,
  Image,
  ActivityIndicator
} from "react-native";
import { withNavigation } from "react-navigation";
import TimeAgo from "react-native-timeago";
import DoubleClick from 'react-native-double-tap'

import { fileActions, layoutActions } from "../../actions";
import { folderIconsList, colors } from "../../constants";
import { getIcon } from "../../helpers";
import IconFolder from "../../components/IconFolder";
import IconFile from "../../components/IconFile";
import Icon from '../../../assets/icons/Icon';

class FileItem extends Component {
  constructor(props) {
    super(props);

    this.downloadFile = this.props.downloadFile;
  }

  onItemPress = () => {
    const { item, isFolder, navigation } = this.props;
    if (isFolder) {
      // Enter in folder
      this.props.dispatch(fileActions.getFolderContent(item.id));
      navigation.setParams({ folderId: item.id });
    } else {
      this.downloadFile(item ? item : null);
    }
  }

  onItemLongPress = () => {
    // Select file/folder
    this.props.dispatch(fileActions.selectFile(this.props.item));
  }

  onDetailsClick = () => {
    const { isFolder } = this.props;
    if (isFolder) {
      this.props.dispatch(layoutActions.openFolderModal());
    } else {
      this.props.dispatch(layoutActions.openFileModal());
    }
  }

  render() {
    const { item, isFolder, isSelected } = this.props;
    const imageSource = getIcon("details");
    const extendStyles = StyleSheet.create({
      text: {
        color: "#000000"
      },
      containerBackground: {
        backgroundColor: isSelected ? "#f2f5ff" : "#fff"
      },
    });

    const itemIcon = isFolder ? (
      <View>
        <IconFolder color={item.color} />
        {
          item.icon ? <View style={{ position: "absolute", left: 35, top: 7 }}>
            <Icon name={item.icon ? folderIconsList[item.icon.id - 1] : ''} color={item.color ? colors[item.color].icon : colors["blue"].icon} height="24" width="24" />
          </View> : <View style={{ position: "absolute", left: 35, top: 7 }}></View>
        }
      </View>
    ) : (
        <IconFile label={item.type} />
      );

    return (
      <TouchableHighlight onPress={this.onItemPress} onLongPress={this.onItemLongPress} underlayColor="#FFF" style={[styles.container, extendStyles.containerBackground]}>
        <View style={styles.fileDetails}>
          <View style={styles.itemIcon}>
            {this.props.isBeingUploaded ? <IconFile isUploading={true} /> : itemIcon}
          </View>
          <View style={styles.nameAndTime}>
            <Text style={[styles.fileName, extendStyles.text]} numberOfLines={1}>
              {item.name}
            </Text>
            {!isFolder && (<TimeAgo style={styles.fileUpdated} time={item.created_at} />)}
          </View>
          <View>
            {isSelected && (
              <TouchableHighlight
                style={styles.buttonDetails}
                underlayColor="#f2f5ff"
                onPress={this.onDetailsClick}
              >
                <Image style={styles.buttonDetailsIcon} source={imageSource} />
              </TouchableHighlight>
            )}
          </View>
        </View>
      </TouchableHighlight>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    height: 80
  },
  fileDetails: {
    flexDirection: 'row'
  },
  itemIcon: {

  },
  nameAndTime: {
    justifyContent: 'center',
    flex: 7
  },
  fileName: {
    fontFamily: "CircularStd-Bold",
    fontSize: 16,
    letterSpacing: -0.1,
    color: "#000000"
  },
  fileUpdated: {
    fontFamily: "CircularStd-Book",
    fontSize: 13,
    color: "#2a5fc9",
    marginTop: 2
  },
  buttonDetails: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 51,
    height: 51,
    marginRight: 10,
    borderRadius: 25.5,
    flex: 1
  },
  buttonDetailsIcon: {
    width: 25,
    height: 25,
    resizeMode: "contain"
  }
});

const mapStateToProps = state => {
  return {
    ...state
  };
};

export default (FileItemComposed = compose(
  connect(mapStateToProps),
  withNavigation
)(FileItem));
