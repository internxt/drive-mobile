import React, { useEffect, useState } from 'react';
import { Image, View, Text, StyleSheet } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import Modal from 'react-native-modalbox';
import { widthPercentageToDP } from 'react-native-responsive-screen';
import { connect } from 'react-redux';
import { fileActions, layoutActions } from '../../redux/actions';
import { Reducers } from '../../redux/reducers/reducers';
export interface DeleteItemModalProps extends Reducers {
    dispatch?: any,
}

function DeleteItemModal(props: DeleteItemModalProps) {
  const selectedItems = props.filesState.selectedItems
  const currentFolderId = props.filesState.folderContent && props.filesState.folderContent.currentFolder
  const [isOpen, setIsOpen] = useState(props.layoutState.showDeleteModal)

  useEffect(() => {
    props.layoutState.showDeleteModal ? setIsOpen(true) : null

  }, [props.layoutState])

  const handleDeleteSelectedItem = () => {
    props.dispatch(fileActions.deleteItems(selectedItems, currentFolderId))
  }

  return (
    <Modal
      isOpen={isOpen}
      swipeArea={2}
      onClosed={() => {
        props.dispatch(layoutActions.closeDeleteModal())
        setIsOpen(false)
      }}
      position='center'
      style={styles.modalContainer}
    >
      <View style={styles.textContainer}>
        <View style={styles.titleContainer}>
          <Image source={require('../../../assets/images/logo.png')} style={styles.image} />
          <Text style={styles.title}>Delete item</Text>
        </View>

        <Text style={styles.subtitle}>Please confirm you want to delete this item. This action can not be undone.</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={() => {
          setIsOpen(false)
        }}>
          <Text style={styles.text}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.blue]} onPress={() => {
          handleDeleteSelectedItem();
          setIsOpen(false)
        }}>
          <Text style={[styles.text, styles.white]}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    width: '100%'
  },
  textContainer: {
    paddingHorizontal: 30
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end'
  },
  image: {
    height: 30,
    width: 26,
    marginRight: 10,
    marginBottom: 4
  },
  title: {
    fontSize: 27,
    fontFamily: 'CerebriSans-Bold',
    color: 'black'
  },
  subtitle: {
    fontSize: 17,
    color: '#737880',
    marginTop: 15
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '80%',
    marginTop: 30
  },
  button: {
    height: 50,
    width: widthPercentageToDP('35'),
    borderRadius: 4,
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

export default connect(mapStateToProps)(DeleteItemModal)