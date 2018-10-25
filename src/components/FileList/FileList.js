import React, { Component } from "react";
import { StyleSheet, View, Text } from "react-native";

import FileItem from "../FileItem/FileItem";

class FileList extends Component {
  render() {
    const { files } = this.props;
    return (
      <View>
        {files.map((file, index) => (
          <FileItem key={index} item={file} />
        ))}
      </View>
    );
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

export default FileList;
