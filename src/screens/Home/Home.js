import React, { Component } from "react";
import { StyleSheet, Text, View, Button } from "react-native";
import { compose } from "redux";
import { connect } from "react-redux";

import AppMenu from "../../components/AppMenu/AppMenu";
import EmptyDirectory from "../../components/EmptyDirectory/EmptyDirectory";
import FileList from "../../components/FileList/FileList";
import { fileActions } from "../../actions";

class Home extends Component {
  constructor(props) {
    super(props);

    this.state = {
      location: "All Files",
      files: []
    };
  }

  componentDidMount() {
    this.props.dispatch(fileActions.getFiles());
  }

  render() {
    const {
      files: { items, loading }
    } = this.props;

    if (loading) {
      return (
        <View>
          <Text>Loading files..</Text>
        </View>
      );
    }

    let content = <EmptyDirectory />;
    if (items.length > 0) {
      console.log("OK");
      content = <FileList files={items} />;
    }

    return (
      <View style={styles.container}>
        <AppMenu navigation={this.props.navigation} />
        <View style={styles.breadcrumbs}>
          <Text style={styles.breadcrumbsTitle}>{this.state.location}</Text>
        </View>
        {content}

        <Button
          title="Go back to sign in"
          onPress={() => {
            this.props.navigation.push("SignIn");
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

const mapStateToProps = state => {
  return {
    ...state
  };
};

export default (HomeComposed = compose(connect(mapStateToProps))(Home));
