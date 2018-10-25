import React, { Component } from "react";
import {
  StyleSheet,
  Text,
  View,
  Button,
  Image,
  TouchableHighlight
} from "react-native";
import { compose } from "redux";
import { connect } from "react-redux";

import AppMenu from "../../components/AppMenu/AppMenu";
import FileList from "../../components/FileList/FileList";
import { getIcon } from "../../helpers";

class Home extends Component {
  constructor(props) {
    super(props);

    this.state = {
      active: 0,
      activeName: "All Files",
      showBack: false
    };
  }

  componentWillReceiveProps(nextProps) {
    const parent = nextProps.navigation.getParam("parent", 0);
    this.setState({
      active: parent,
      activeName:
        parent === 0 ? "All Files" : `Active dir ID: ${this.state.active}`,
      showBack: parent !== 0
    });
  }

  render() {
    const { navigation } = this.props;
    const parent = navigation.getParam("parent", 0);
    const arrowBack = getIcon("back");

    const backButton = (
      <TouchableHighlight
        style={styles.button}
        underlayColor="#FFF"
        onPress={() => navigation.push("Home", { parent: 0 })}
      >
        <View style={styles.breadcrumbs}>
          <Image style={styles.icon} source={arrowBack} />
          <Text style={styles.breadcrumbsLabel}>All Files</Text>
        </View>
      </TouchableHighlight>
    );

    return (
      <View style={styles.container}>
        <AppMenu navigation={this.props.navigation} />
        <View style={styles.breadcrumbs}>
          <Text style={styles.breadcrumbsTitle}>{this.state.activeName}</Text>
          {this.state.showBack && backButton}
        </View>

        <FileList parent={parent} />

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
