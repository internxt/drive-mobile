import React, { Component } from "react";
import { compose } from "redux";
import { connect } from "react-redux";
import { StyleSheet, View, Text } from "react-native";

import { fileActions } from "../../actions";
import EmptyDirectory from "../EmptyDirectory/EmptyDirectory";
import FileItem from "../FileItem/FileItem";

class FileList extends Component {
  render() {
    const { filesState } = this.props;
    const { loading, folderContent } = filesState;

    if (loading || !folderContent) {
      return (
        <View>
          <Text>Loading files..</Text>
        </View>
      );
    }

    let content = <EmptyDirectory />;
    if (folderContent.files.length > 0 || folderContent.children.length > 0) {
      content = (
        <View>
          {folderContent.children.map(file => (
            <FileItem key={file.id} item={file} isFolder={true} />
          ))}
          {folderContent.files.map(file => (
            <FileItem key={file.id} item={file} isFolder={false} />
          ))}
        </View>
      );
    }

    return content;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff"
  },
  heading: {
    fontFamily: "CircularStd-Black",
    fontSize: 25,
    letterSpacing: -0.8,
    color: "#000000",
    marginBottom: 10
  },
  subheading: {
    fontFamily: "CircularStd-Book",
    fontSize: 17,
    opacity: 0.84,
    letterSpacing: -0.1,
    color: "#404040"
  }
});

const mapStateToProps = state => {
  return {
    ...state
  };
};

export default (FileListComposed = compose(connect(mapStateToProps))(FileList));
