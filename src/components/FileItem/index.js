import React, { Component } from "react";
import { compose } from "redux";
import { connect } from "react-redux";
import {
  StyleSheet,
  View,
  Text,
  TouchableHighlight
} from "react-native";
import { withNavigation } from "react-navigation";
import TimeAgo from "react-native-timeago";

import { fileActions, layoutActions } from "../../actions";
import { folderIconsList, colors } from "../../constants";
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
    // Open item modal
    this.props.dispatch(layoutActions.openItemModal(this.props.item));
  }

  render() {
    const { item, isFolder, isSelected } = this.props;
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
            <TouchableHighlight
              style={styles.buttonDetails}
              underlayColor="#f2f5ff"
              onPress={this.onDetailsClick}>
              <Icon name="details" />
            </TouchableHighlight>
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
