import React, { Component } from "react";
import { StyleSheet, View, TouchableHighlight, Text } from "react-native";

class SettingsItem extends Component {

    properties = {
        onClick: null
    }

    constructor(props) {
        super(props);
        this.properties.onClick = props.onClick;
        this.handlePress = this.handlePress.bind(this);
    }

    handlePress(e) {
        if (this.properties.onClick) {
            this.properties.onClick();
        }
    }

    render() {
        return <TouchableHighlight style={styles.itemContainer} onPress={this.handlePress}>
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