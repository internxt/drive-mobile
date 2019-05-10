import React, { Component, Fragment } from "react";
import { compose } from "redux";
import { connect } from "react-redux";
import {
  StyleSheet,
  View,
  Text,
  TouchableHighlight,
  Image
} from "react-native";
import { withNavigation } from "react-navigation";
import TimeAgo from "react-native-timeago";

import { fileActions } from "../../actions";
import { colors } from "../../constants";
import { getIcon } from "../../helpers";
import IconFolder from "../../components/IconFolder";
import IconFile from "../../components/IconFile";

class FileItem extends Component {
  constructor() {
    super();

    this.onItemClick = this.onItemClick.bind(this);
    this.onDetailsClick = this.onDetailsClick.bind(this);
  }

  onItemClick(event) {
    event.preventDefault();
    const { item, isFolder, navigation } = this.props;

    if (isFolder) {
      this.props.dispatch(fileActions.getFolderContent(item.id));
      navigation.setParams({ folderId: item.id });
    } else {
      this.props.dispatch(fileActions.selectFile(item));
    }
  }

  onDetailsClick() {
    const { item } = this.props;
    console.log("Show details: ", item);
  }

  render() {
    const { item, isFolder, isSelected } = this.props;
    const { color } = item.style || {
      color: "blue",
      icon: ""
    };
    const imageSource = getIcon("details");

    const extendStyles = StyleSheet.create({
      text: {
        color: "#000000"
      },
      containerBackground: {
        backgroundColor: isSelected ? "#f2f5ff" : "#fff"
      }
    });

    const itemIcon = isFolder ? <IconFolder color={color} /> : <IconFile label={item.type} />;

    return (
      <TouchableHighlight
        underlayColor="#FFF"
        style={[styles.container, extendStyles.containerBackground]}
        onPress={this.onItemClick}
      >
        <View style={styles.fileDetails}>
          <View style={styles.itemIcon}>
            {itemIcon}
          </View>
          <View style={styles.nameAndTime}>
            <Text style={[styles.fileName, extendStyles.text]} numberOfLines={1}>
              {item.name}
            </Text>
            {!isFolder && (<TimeAgo style={styles.fileUpdated} time={item.added} />)}
          </View>
          <View style={styles.buttonDetailsContainer}>
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
    display: 'flex'
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
  buttonDetailsContainer: {
  },
  buttonDetails: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 51,
    height: 51,
    marginRight: 10,
    borderRadius: 25.5
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
