import React, { Component } from "react";
import { compose } from "redux";
import { connect } from "react-redux";
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { fileActions } from '../../actions'

import EmptyDirectory from "../EmptyDirectory";
import FileItem from "../FileItem";

class FileList extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isRefreshing: false
    }

    this.refreshList = this.refreshList.bind(this);
  }

  refreshList = () => {
    this.setState({ isRefreshing: true }, () => {
      this.props.dispatch(fileActions.getFolderContent(this.props.filesState.folderContent.currentFolder));
    })
  }



  render() {
    const { filesState } = this.props;
    const { loading, folderContent, selectedFile } = filesState;

    if (loading || !folderContent) {
      return (
        <View style={{ justifyContent: 'center', flex: 1, alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      );
    }

    let content = <EmptyDirectory />;
    if (folderContent.files.length > 0 || folderContent.children.length > 0) {
      content = (
        <ScrollView refreshControl={<RefreshControl isRefreshing={this.state.isRefreshing} onRefresh={this.refreshList} />}>
          {folderContent.children.map(file => (
            <FileItem key={file.id} item={file} isFolder={true} />
          ))}
          {folderContent.files.map(file => (
            <FileItem
              key={file.id}
              item={file}
              isFolder={false}
              isSelected={selectedFile && selectedFile.id === file.id}
              downloadFile={this.props.downloadFile}
            />
          ))}
        </ScrollView>
      );
    }

    return content;
  }
}

const mapStateToProps = state => {
  return { ...state };
};

export default (FileListComposed = compose(connect(mapStateToProps))(FileList));
