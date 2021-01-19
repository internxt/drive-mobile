import * as React from 'react';
import { FlatList, Image, StyleProp, StyleSheet, Text, TouchableHighlight, View, ViewStyle } from 'react-native';
import { connect } from 'react-redux';

const addAlbum = require('../../../assets/icons/photos/group-13.png')

export interface CreateAlbumProps {
    style?: StyleProp<ViewStyle>
    album?: any
    navigation: any
}

// TODO: Add album param
function CreateAlbumCard(props: CreateAlbumProps): JSX.Element {
    return (


        <TouchableHighlight
                underlayColor="#fff"
                style={styles.albumCard}
                onPress={() => {
                    props.navigation.navigate("CreateAlbum")
                }}
            >
                <View style={styles.card}>

                    <Image source={addAlbum} style={{ height: 39, width: 47}}/>
                    <Text style={{
                        fontFamily: 'Averta-Semibold',
                        marginTop: 14,
                        fontSize: 16
                    }}>
                        Create New Album
                    </Text>

                </View>
        </TouchableHighlight>


    )

}

const styles = StyleSheet.create({
    albumCard: {
        paddingHorizontal: 15,
        paddingVertical: 15,
    },
    card: {
        display: 'flex',
        alignItems: 'center',
        borderRadius: 9,
        paddingVertical: 57,
        backgroundColor: '#f5f5f5',
        borderColor: 'white',
        borderWidth: 12,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,

        elevation: 5,
        marginHorizontal: 4
    },
});

const mapStateToProps = (state: any) => {
    return { ...state };
};

export default connect(mapStateToProps)(CreateAlbumCard);