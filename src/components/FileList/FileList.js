import React, { Component } from "react";
import { compose } from "redux";
import { connect } from "react-redux";
import { View, Text } from "react-native";

import EmptyDirectory from "../EmptyDirectory/EmptyDirectory";
import FileItem from "../FileItem/FileItem";

class FileList extends Component {
  render() {
    const { filesState } = this.props;
    const { loading, folderContent, selectedFile } = filesState;

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
            <FileItem
              key={file.id}
              item={file}
              isFolder={false}
              isSelected={selectedFile && selectedFile.id === file.id}
            />
          ))}
        </View>
      );
    }

    return content;
  }
}

const mapStateToProps = state => {
  return {
    ...state
  };
};

export default (FileListComposed = compose(connect(mapStateToProps))(FileList));
