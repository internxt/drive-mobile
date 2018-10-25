import React, { Component } from "react";
import { compose } from "redux";
import { connect } from "react-redux";
import { StyleSheet, View, Text } from "react-native";

import { fileActions } from "../../actions";
import EmptyDirectory from "../EmptyDirectory/EmptyDirectory";
import FileItem from "../FileItem/FileItem";

class FileList extends Component {
  componentDidMount() {
    this.props.dispatch(
      fileActions.getFiles({
        id: this.props.parent
      })
    );
  }

  render() {
    const { files } = this.props;
    const { loading, items } = files;

    if (loading) {
      return (
        <View>
          <Text>Loading files..</Text>
        </View>
      );
    }

    let content = <EmptyDirectory />;
    if (items.length > 0) {
      content = (
        <View>
          {items.map((file, index) => (
            <FileItem key={index} item={file} />
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
