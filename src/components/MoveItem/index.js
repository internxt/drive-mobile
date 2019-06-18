import React, { Component } from "react";
import { compose } from "redux";
import { connect } from "react-redux";
import {
  StyleSheet,
  View,
  Text,
  TouchableHighlight,
  Image
} from "react-native";
import { withNavigation } from "react-navigation";

import { folderIconsList, colors } from "../../constants";
import { getIcon } from "../../helpers";
import IconFolder from "../../components/IconFolder";
import Icon from '../../../assets/icons/Icon';

class MoveItem extends Component {
  constructor(props) {
    super(props);
  }

  onItemClick = () => {}

  render() {
    const { item } = this.props;
    const extendStyles = StyleSheet.create({
      text: {
        color: "#000000"
      },
      containerBackground: {
        backgroundColor: "#fff"
      },
    });

    const itemIcon = (
      <View>
        <IconFolder color={item.color} />
        {
          item.icon ? <View style={{ position: "absolute", left: 35, top: 7 }}>
            <Icon name={item.icon ? folderIconsList[item.icon.id - 1] : ''} color={item.color ? colors[item.color].icon : colors["blue"].icon} height="24" width="24" />
          </View> : <View style={{ position: "absolute", left: 35, top: 7 }}></View>
        }
      </View>
    );

    return (
      <TouchableHighlight onPress={() => {this.props.selectFolder(this.props.item)}} underlayColor="#FFF" style={[styles.container, extendStyles.containerBackground]}>
        <View style={styles.fileDetails}>
          <View style={styles.itemIcon}>{itemIcon}</View>
          <View style={styles.nameAndTime}>
            <Text style={[styles.fileName, extendStyles.text]} numberOfLines={1}>
              {item.name}
            </Text>
          </View>
        </View>
      </TouchableHighlight>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    height: 80
  },
  fileDetails: {
    flexDirection: 'row'
  },
  nameAndTime: {
    justifyContent: 'center',
    flex: 7
  },
  fileName: {
    fontFamily: "CircularStd-Bold",
    fontSize: 16,
    letterSpacing: -0.1,
    color: "#000000"
  },
  buttonDetails: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 51,
    height: 51,
    marginRight: 10,
    borderRadius: 25.5,
    flex: 1
  }
});

const mapStateToProps = state => {
  return { ...state };
};

export default (MoveItemComposed = compose(connect(mapStateToProps),withNavigation)(MoveItem));
