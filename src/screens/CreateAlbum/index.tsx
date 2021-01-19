import React, { Component, useState } from 'react';
import { Alert, Button, FlatList, Pressable, StyleSheet, Text, TouchableHighlight, View } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { connect, useDispatch, useSelector } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import { BackButton } from '../../components/BackButton';
import { useLinkProps, useNavigation } from '@react-navigation/native';
import PhotoItem from '../../components/PhotoItem';

interface CreateAlbumProps {
    route: any;
    navigation?: any
    filesState?: any
    dispatch?: any,
    layoutState?: any
    authenticationState?: any
}

function CreateAlbum(props: CreateAlbumProps): JSX.Element  {
    const [inputAlbumTitle, setInputAlbumTitle] = useState('Untitled Album')

    let albumPhotos = props.filesState.selectedItems;

    const keyExtractor = (item: any, index: any) => index;
    const renderItem = ({ item }) => (
        <TouchableHighlight
            underlayColor="#FFF"
            onPress={() => {
                
            }}

        >
            <PhotoItem source={item} isLoading={false}/>
        </TouchableHighlight>
    );

    return (
        <View style={styles.container}>


            <View style={styles.albumHeader}>
                <BackButton navigation={props.navigation} ></BackButton>
                <View style={{ alignSelf: 'center' }}>
                    <TextInput
                        style={styles.albumTitle}
                        onChangeText={value => setInputAlbumTitle(value)}
                        value={inputAlbumTitle}
                    />
                </View>
                <TouchableHighlight style={styles.nextBtn}>
                    <Text style={styles.nextText}>
                        Next
                    </Text>
                </TouchableHighlight>
            </View>

            <View style={styles.selectHeader}>
                <View style={styles.selectPhotos}>
                    <Pressable
                        onPress={() => { console.log("hola"); /*props.dispatch(openPhotoListModal())*/ }}>
                        <Text style={styles.photosText}>
                            Select Photos
                        </Text>
                    </Pressable>
                </View>


                <TouchableHighlight
                    style={styles.photoSelector}
                    underlayColor="#FFF"
                    onPress={async () => {
                        const { status } = await ImagePicker.requestCameraPermissionsAsync();
                        if (status === 'granted') {
                            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All });
                            if (!result.cancelled) {
                                //uploadFile(result, props);
                                console.log("result", result.uri)
                                //albumPhotos.push(result.uri)
                            }
                        } else {
                            Alert.alert('Camera permission needed to perform this action')
                        }
                    }}>
                    <Text style={{
                        fontFamily: 'Averta-Semibold',
                        color: '#0084ff',
                        fontSize: 15
                    }}>
                        Select from phone
                        </Text>
                </TouchableHighlight>
            </View>

            {albumPhotos.length > 0
                ? <View >
                    <FlatList
                        keyExtractor={keyExtractor}
                        renderItem={renderItem}
                        data={albumPhotos}
                        extraData={props.layoutState.showPhotoListModal}
                        initialNumToRender={20}
                        numColumns={3}
                        contentContainerStyle={styles.items}
                        horizontal={false}
                    ></FlatList>
                </View>
                : <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}> Album is Empty.</Text>
                </View>}

        </View>
    );
}


const styles = StyleSheet.create({
    container: {
        alignContent: "center",
        backgroundColor: '#fff',
        paddingTop: -10,
        paddingBottom: 15,
        marginBottom: 13,

    },
    items: {
        display: 'flex',
        justifyContent: 'center',
        paddingRight: 10
    },
    albumHeader: {
        display: 'flex',
        flexDirection: "row",
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 15,
        paddingVertical: 7,
        paddingHorizontal: 20,
        height: '8%'
    },
    selectHeader: {
        display: 'flex',
        flexDirection: "row",
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 5,
        marginTop: 12,

    },
    selectPhotos: {
        borderColor: 'red',
        borderRadius: 3
    },
    albumTitle: {
        fontFamily: 'Averta-Semibold',
        fontSize: 17,
        letterSpacing: 0,
        color: '#000000',
        textAlign: 'center',
    },
    photosText: {
        fontFamily: 'Averta-Bold',
        fontSize: 18,
        color: 'black'
    },
    photoSelector: {
        fontFamily: 'Averta-Regular',
        fontSize: 15,
        letterSpacing: -0.2,
        paddingTop: 5,
        color: '#0084ff',
    },
    nextBtn: {
        paddingVertical: 6,
        paddingHorizontal: 18,
        backgroundColor: '#0084ff',
        borderRadius: 23.8,
    },
    nextText: {
        color: 'white',
        fontFamily: 'Averta-Semibold',
        fontSize: 16
    },
    emptyBox: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '89%'
    },
    emptyText: {
        fontFamily: 'Averta-Semibold',
        fontSize: 25,
        letterSpacing: -0.09
    }
});

const mapStateToProps = (state: any) => {
    return { ...state };
};

export default connect(mapStateToProps)(CreateAlbum);