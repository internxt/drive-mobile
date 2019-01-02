import React, { Component, Fragment } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableHighlight,
  Image
} from "react-native";
import { compose } from "redux";
import { connect } from "react-redux";

import MenuItem from "./MenuItem";
import { getIcon } from "../../helpers";
import { layoutActions } from "../../actions";

const arrowBack = getIcon("back");

class AppMenu extends Component {
  constructor(props) {
    super(props);

    this.handleMenuClick = this.handleMenuClick.bind(this);
    this.handleFolderCreate = this.handleFolderCreate.bind(this);
  }

  handleMenuClick() {
    console.log("menu item clicked");
  }

  handleFolderCreate(parentFolderId) {
    this.props.navigation.push("CreateFolder", { parentFolderId });
  }

  render() {
    const {
      filesState: { folderContent, selectedFile }
    } = this.props;

    const isRoot = folderContent && folderContent.hierarchy_level === 1;
    const isFileSelected = Boolean(selectedFile);
    const isButtonDetailsHidden = isRoot && !isFileSelected;

    let content = (
      <Fragment>
        <MenuItem
          name="search"
          onClickHandler={() => this.props.dispatch(layoutActions.openSearch())}
        />
        <MenuItem name="list" />
        <MenuItem name="upload" />
        <MenuItem
          name="create"
          onClickHandler={() => this.handleFolderCreate(folderContent.id)}
        />
        <MenuItem
          name="details"
          hidden={isButtonDetailsHidden}
          onClickHandler={() =>
            isFileSelected
              ? console.log("file details")
              : console.log("folder details")
          }
        />
        <MenuItem
          name="settings"
          onClickHandler={() => this.props.navigation.push("Settings")}
        />
      </Fragment>
    );

    if (this.props.breadcrumbs) {
      const { name } = this.props.breadcrumbs;

      content = (
        <TouchableHighlight
          style={styles.button}
          underlayColor="#FFF"
          onPress={() => this.props.navigation.goBack()}
        >
          <View style={styles.breadcrumbs}>
            <Image style={styles.icon} source={arrowBack} />
            <Text style={styles.breadcrumbsLabel}>{name}</Text>
          </View>
        </TouchableHighlight>
      );
    }

    return <View style={styles.container}>{content}</View>;
  }
}

const styles = StyleSheet.create({
  container: {
    height: 54,
    flexDirection: "row",
    justifyContent: "flex-start",
    backgroundColor: "#fff",
    marginTop: 25,
    paddingTop: 3
  },
  button: {
    flex: 1
  },
  breadcrumbs: {
    position: "relative",
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },
  breadcrumbsLabel: {
    fontFamily: "CircularStd-Bold",
    fontSize: 21,
    letterSpacing: -0.2,
    color: "#000000"
  },
  icon: {
    position: "absolute",
    left: 0,
    top: 17,
    width: 10,
    height: 17,
    resizeMode: "contain"
  }
});

const mapStateToProps = state => {
  return {
    ...state
  };
};

export default (AppMenuComposed = compose(connect(mapStateToProps))(AppMenu));
