import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FlatList, TouchableOpacity } from 'react-native-gesture-handler';
import Modal from 'react-native-modalbox';
import { heightPercentageToDP, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { connect } from 'react-redux';
import FileItem from '../../components/FileItem';
import Separator from '../../components/Separator';
import { fileActions, layoutActions } from '../../redux/actions';

export interface MoveFilesProps {
    dispatch?: any,
    filesState?: any,
    fileActions?: any,
    layoutState?: any,
}

function MoveFilesModal(props: MoveFilesProps) {
    const [ isOpen, setIsOpen ] = useState(props.layoutState.showMoveModal)
    const [ folderlist, setFolderList ] = useState([])
    const { folderContent } = props.filesState

    useEffect(() => {
        const folders = folderContent && folderContent.children || []
        setFolderList(folders)
        console.log(folderlist.length)
        console.log('----- MOVE FILES FOLDERS ------', folderlist)
        props.layoutState.showMoveModal === true ? setIsOpen(true) : null

    }, [props.layoutState.showMoveModal])

    return (
        <Modal isOpen={isOpen}
            swipeArea={2}
            onClosed={() => {
                props.dispatch(layoutActions.closeMoveFilesModal())
            }} 
            position='center' 
            style={styles.container}
        >
            <Text style={styles.title}>Choose a folder to move this file.</Text>
            
            <Separator />
            
            <View style={styles.folder_list}>
                <FlatList
                    data={folderlist}
                    renderItem={folder => (
                        <FileItem 
                            isFolder={true}
                            key={folder.item.id}
                            item={folder.item}
                        />
                    )}
                />
            </View>
            
            <View style={styles.button_container}>
                <TouchableOpacity style={styles.button}
                    onPress={() => {
                        props.dispatch(layoutActions.closeMoveFilesModal())
                        setIsOpen(false)
                    }}
                >
                    <Text style={styles.text}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, styles.blue]}>
                    <Text style={[styles.text, styles.white]}>Move</Text>
                </TouchableOpacity>
            </View>
            
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        height: '100%'
    },

    title: {
        height: 30,
        fontFamily: 'CircularStd-Bold',
        fontSize: 21,
        letterSpacing: -0.2,
        paddingLeft: 20,
        color: '#000000',
        marginTop: 20
    },

    folder_list: {
        height: '75%'
    },

    button_container: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center'
    }, 

    button: {
        height: 50, 
        width: wp('40'),
        borderRadius: 8, 
        borderWidth: 2,
        backgroundColor: '#fff',
        borderColor: 'rgba(151, 151, 151, 0.2)',
        justifyContent: 'center',
        alignItems: 'center'
    },

    blue: {
        backgroundColor: '#4585f5'
    },

    text: {
        color: '#5c6066', 
        fontFamily: 'CerebriSans-Bold', 
        fontSize: 16
    },

    white: {
        color: '#fff'
    }
})

const mapStateToProps = (state: any) => {
    return { ...state }
};

export default connect(mapStateToProps)(MoveFilesModal)