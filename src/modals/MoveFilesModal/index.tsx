import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { FlatList, TouchableOpacity } from 'react-native-gesture-handler';
import Modal from 'react-native-modalbox';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { connect } from 'react-redux';
import Separator from '../../components/Separator';
import { getIcon } from '../../helpers/getIcon';
import { fileActions, layoutActions } from '../../redux/actions';
import Folder from './Folder';

interface MoveFilesProps {
    layoutState?: any
    filesState?: any
    authenticationState?: any
    dispatch?: any
}

function MoveFilesModal(props: MoveFilesProps) {
    const [ isOpen, setIsOpen ] = useState(props.layoutState.showMoveModal)
    const [ currentfolderid, setCurrentFolderId ] = useState('')
    const [ parentfolderid, setParentFolderId ] = useState('')
    const [ firstfolder, setFirstFolder ] = useState('')
    const [ selectedfile, setSelectedFile ] = useState(0)

    const { folderContent } = props.filesState
    let folderList: object[] = folderContent && folderContent.children || [];

    useEffect(() => {
        props.layoutState.showMoveModal === true ? setIsOpen(true) : null
        if (props.filesState.folderContent) {
            setCurrentFolderId(props.filesState.folderContent.currentFolder)
            setSelectedFile(props.filesState.selectedFile)
            setParentFolderId(props.filesState.folderContent.parentId)
            setFirstFolder(props.filesState.folderContent.currentFolder)
        }
    }, [props.layoutState.showMoveModal])

    useEffect(() => {
        if( props.filesState.folderContent) {
            setCurrentFolderId(props.filesState.folderContent.currentFolder)
            setParentFolderId(props.filesState.folderContent.parentId)
        }
        //return console.log('---- CURRENTFOLDERID AND SELECTEDFILE ----', currentfolderid, selectedfile)
    }, [props.filesState.folderContent])

    useEffect(() => {
        if (!props.filesState.folderContent) {
            const rootFolderId = props.authenticationState.user.root_folder_id
            props.dispatch(fileActions.getFolderContent(rootFolderId))
        }
    }, [])

    const moveFile = async (result: any) => {
        // When modal is closed by move action result = folder id otherwise ans = -1
        if (result >= 0 && selectedfile) {
            await props.dispatch(fileActions.moveFile(selectedfile.fileId, result))

            props.dispatch(layoutActions.closeMoveFilesModal())
            setIsOpen(false)
        }
    }

    return (
        <Modal isOpen={isOpen}
            swipeArea={2}
            onClosed={() => {
                props.dispatch(layoutActions.closeMoveFilesModal())
            }} 
            position='center' 
            style={styles.container}
        >
            <View style={styles.breadcrumbs}>
                <Text style={styles.title}>Choose a folder to move this file.</Text>

                <TouchableOpacity
                    style={parentfolderid ? styles.back_button : styles.hidden}
                    onPress={() => {
                        props.dispatch(fileActions.getFolderContent(parentfolderid))
                    }}>
                        <Image style={styles.backIcon} source={getIcon('back')} />
                </TouchableOpacity>
            </View>

            <Separator />
            
            <View style={styles.folder_list}>
                <FlatList
                    data={folderList}
                    renderItem={folder => (
                        <Folder 
                            isFolder={true}
                            key={folder.item.id}
                            item={folder.item}
                        />
                    )}
                    keyExtractor={folder => folder.id}
                />
            </View>
            
            <View style={styles.button_container}>
                <TouchableOpacity style={styles.button}
                    onPress={() => {
                        props.dispatch(layoutActions.closeMoveFilesModal())
                        setIsOpen(false)
                        props.dispatch(fileActions.getFolderContent(firstfolder))
                    }}
                >
                    <Text style={styles.text}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, styles.blue]}
                    onPress={() => {
                        console.log('--- CURRENT FOLDER ID ---', currentfolderid)
                        console.log('--- SELECTED FILE ---', selectedfile)
                        moveFile(currentfolderid)
                    }}
                >
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

    breadcrumbs: {
        display: 'flex',
        flexWrap: 'nowrap',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: "center",
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

    back_button: {
        marginRight: 12,
        marginTop: wp('3.5'),
        alignItems: 'center',
        justifyContent: 'center',
        width: 40, //container size is bigger so easy to touch
        height: 40
    },

    backIcon: {
        height: 15,
        width: 10,
        marginRight: 5
    },

    backLabel: {
        fontFamily: 'CircularStd-Medium',
        fontSize: 19,
        letterSpacing: -0.2,
        color: '#000000'
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
    },

    hidden: {
        display: 'none'
    }
})

const mapStateToProps = (state: any) => {
    return { ...state }
};

export default connect(mapStateToProps)(MoveFilesModal)