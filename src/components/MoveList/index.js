import React, { Component } from "react";
import { compose } from "redux";
import { connect } from "react-redux";
import { ScrollView, View, Text, TouchableHighlight, StyleSheet, Image } from "react-native";
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';

import MoveItem from "../MoveItem";
import { fileService } from "../../services";
import { getIcon } from '../../helpers';

const iconArrowBack = getIcon('back');

class MoveList extends Component {
  constructor(props) {
    super(props);

    this.state = {
      folders: [],
      selectedFolder: null,
      parentId: null
    }
  }

  async componentDidMount() {
    // On component init, load folder tree
    this.loadFolder(this.props.folderId);
  }

  loadFolder = async (folderId) => {
    const data = await fileService.getFolderContent(folderId);
    this.setState({
      folders: data.children,
      selectedFolder: {
        id: data.id,
        name: data.name
      },
      parentId: data.parentId
    }) 
  }

  render() {
    const { folders } = this.state;
    let content = null;

    if (folders.length > 0) {
      content = (folders.map(folder => (
              <MoveItem
                key={folder.id}
                item={folder} 
                selectFolder={() => { this.loadFolder(folder.id); }}/>
            ))
      );
    }
    return (
      <View style={[styles.container,this.props.style]}>
        <View style={styles.listHeader}>
          {this.state.parentId ? <TouchableHighlight style={styles.iconContainer}
            underlayColor="#FFF"
            onPress={() => { this.loadFolder(this.state.parentId); }}>
            <Image style={styles.iconArrow} source={iconArrowBack} />
          </TouchableHighlight> : <Text style={[styles.iconContainer, styles.iconArrow]} ></Text>}
          <Text style={styles.label}>{(this.state.parentId !== null && this.state.selectedFolder) ? this.state.selectedFolder.name : 'Home'}</Text>
        </View>
        <ScrollView>
          {content}
        </ScrollView>
        <View style={styles.buttonView}>
          <TouchableHighlight style={[styles.button, { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#c9c9c9"}]} onPress={() => { this.props.onMoveFile(-1) }}>
            <Text style={[styles.buttonText, { color: "#5c5c5c"}]}>Cancel</Text>
          </TouchableHighlight>
          <TouchableHighlight style={[styles.button, { backgroundColor: "#4585f5"}]} onPress={() => { this.props.onMoveFile(this.state.selectedFolder.id) }}>
            <Text style={[styles.buttonText, { color: "#FFFFFF"}]}>Move here</Text>
          </TouchableHighlight>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    alignContent: "space-between"
  },
  buttonView: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginRight: 10
  },
  button: {
    margin: 10,
    padding: 5,
    borderRadius: 4,
    width: wp('40%'),
    height: 60,
    alignItems: "center",
    justifyContent: "center"
  },
  buttonText: {
    fontFamily: 'CircularStd-Bold',
    fontSize: 18,
    letterSpacing: -0.2
  },
  label: {
    fontFamily: "CircularStd-Medium",
    fontSize: 19,
    letterSpacing: -0.2,
    alignSelf: "center"
  },
  iconContainer: {
    marginRight: 15,
    marginLeft: 10,
    paddingLeft: 15
  },
  iconArrow: {
    height: 12, 
    width: 10
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center"
  }
})

const mapStateToProps = state => {
  return { ...state };
};

export default (MoveListComposed = compose(connect(mapStateToProps))(MoveList));
