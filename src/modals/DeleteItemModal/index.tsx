import { useEffect } from 'react';
import { Image, Modal, View, Text } from 'react-native';
import { TouchableHighlight } from 'react-native-gesture-handler';
import { fileActions } from '../../redux/actions';

export interface DeleteItemModalProps {
    dispatch?: any,
    filesState?: any,
    fileActions?: any,
}

const DeleteItemModal: React.FC<DeleteItemModalProps> = (props) => {

    const handleDeleteSelectedItem = () => {
        const itemsToDelete = props.filesState.selectedItems
        props.dispatch(fileActions.deleteItems(itemsToDelete, props.filesState.folderContent.currentFolder))
    }

    const closeDeleteItemsModal = () => {
        modalDeleteFiles.current.close();
    }

    useEffect(() => {
        console.log("------------- DELETE ITEM MODAL PROPS ---------------", props)
    }, [])

    return (
        <Modal ref={modalDeleteFiles} style={{ padding: 24 }}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <View>
                    <Image source={require('../../../assets/images/logo.png')} style={{ width: 55, height: 29, marginBottom: 22 }} />
                    <Text style={{ fontSize: 27, fontFamily: 'CircularStd-Bold' }}>Delete item.</Text>
                    <Text style={{ fontSize: 17, color: '#737880', marginTop: 15 }}>Please confirm you want to delete this item. This action can’t be undone.</Text>

                    <View style={{ flexDirection: 'row', marginTop: 40 }}>
                        <TouchableHighlight style={{
                            height: 60, borderRadius: 4, borderWidth: 2,
                            backgroundColor: '#fff',
                            borderColor: 'rgba(151, 151, 151, 0.2)',
                            justifyContent: 'center',
                            alignItems: 'center',
                            width: '45%'
                        }} onPress={() => {
                            closeDeleteItemsModal();
                        }}>
                            <Text style={{ color: '#5c6066', fontFamily: 'CerebriSans-Bold', fontSize: 16 }}>Cancel</Text>
                        </TouchableHighlight>

                        <TouchableHighlight style={{
                            height: 60, borderRadius: 4, borderWidth: 2,
                            backgroundColor: '#4585f5',
                            borderColor: 'rgba(151, 151, 151, 0.2)',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginLeft: 20,
                            width: '45%'
                        }} onPress={() => {
                            handleDeleteSelectedItem();
                            closeDeleteItemsModal();
                        }}>
                            <Text style={{ color: '#fff', fontFamily: 'CerebriSans-Bold', fontSize: 16 }}>Confirm</Text>
                        </TouchableHighlight>

                    </View>

                </View>
            </View>
        </Modal>
    );
}

export default DeleteItemModal;