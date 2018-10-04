import React, { Component } from "react";
import { StyleSheet, Text, View, Button } from "react-native";

import AppMenu from "../../components/AppMenu/AppMenu";
import EmptyDirectory from "../../components/EmptyDirectory/EmptyDirectory";

class Home extends Component {
  constructor(props) {
    super(props);

    this.state = {
      location: "All Files",
      files: []
    };
  }

  render() {
    let content = <EmptyDirectory />;
    const { files } = this.state;

    if (files.length > 0) {
      // content = <FileDirectory>
    }

    return (
      <View style={styles.container}>
        <AppMenu />
        <View style={styles.breadcrumbs}>
          <Text style={styles.breadcrumbsTitle}>{this.state.location}</Text>
        </View>
        {content}

        <Button
          title="Go back to sign in"
          onPress={() => {
            this.props.navigation.navigate("SignIn");
          }}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    backgroundColor: "#fff"
  },
  breadcrumbs: {
    borderBottomColor: "#e6e6e6",
    borderBottomWidth: 2,
    marginTop: 30,
    paddingBottom: 30
  },
  breadcrumbsTitle: {
    fontFamily: "CircularStd-Bold",
    fontSize: 21,
    letterSpacing: -0.2,
    paddingLeft: 20,
    color: "#000000"
  }
});

export default Home;
