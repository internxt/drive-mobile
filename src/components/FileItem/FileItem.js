import React, { Component, Fragment } from "react";
import { compose } from "redux";
import { connect } from "react-redux";
import { StyleSheet, View, Text, TouchableHighlight } from "react-native";
import { withNavigation } from "react-navigation";
import TimeAgo from "react-native-timeago";

import { colors } from "../../constants";
import IconFolder from "../../components/IconFolder/IconFolder";
import IconFile from "../../components/IconFile/IconFile";

class FileItem extends Component {
  render() {
    const { item, navigation } = this.props;
    const { color } = item.style;
    const isFolder = item.type === "FOLDER";

    const extendStyles = StyleSheet.create({
      text: {
        color: isFolder ? colors[color].code : "#000000"
      }
    });

    const itemIcon = isFolder ? (
      <IconFolder color={color} />
    ) : (
      <IconFile label={item.type} />
    );

    return (
      <TouchableHighlight
        style={styles.container}
        onPress={() =>
          isFolder ? navigation.push("Home", { parent: item.id }) : {}
        }
      >
        <Fragment>
          {itemIcon}
          <View>
            <Text style={[styles.fileName, extendStyles.text]}>
              {item.name}
            </Text>
            {!isFolder && (
              <TimeAgo style={styles.fileUpdated} time={item.added} />
            )}
          </View>
        </Fragment>
      </TouchableHighlight>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    height: 80,
    backgroundColor: "#fff",
    borderBottomColor: "#e6e6e6",
    borderBottomWidth: 2
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
