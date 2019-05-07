import React, { Component } from "react";
import { StyleSheet, View } from "react-native";

class Separator extends Component {
    render() {
        return <View style={styles.separator} />;
    }
}

const styles = StyleSheet.create({
    separator: {
        borderWidth: 1,
        height: 1,
        borderColor: '#f2f2f2',
        marginTop: 12,
        marginBottom: 12
    }
});

module.exports = Separator;