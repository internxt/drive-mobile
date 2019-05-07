import React, { Component } from "react";
import { StyleSheet, View, TouchableHighlight, Text } from "react-native";

class SettingsItem extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        return <TouchableHighlight style={styles.itemContainer}>
            <Text style={styles.itemText}>
                {this.props.text}
            </Text>
        </TouchableHighlight>
    }
}

const styles = StyleSheet.create({
    itemContainer: {
        paddingTop: 13,
        paddingBottom: 13,
        paddingLeft: 24
    },
    itemText: {
        fontFamily: 'CerebriSans-Bold',
        fontSize: 19,
        fontWeight: '500',
        color: '#000000'
    }
});

export default SettingsItem;