import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableHighlight, Platform } from 'react-native';
import Modal from 'react-native-modalbox';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { connect } from 'react-redux';
import { fileActions, layoutActions } from '../../redux/actions';
import { Reducers } from '../../redux/reducers/reducers';
import * as Unicons from '@iconscout/react-native-unicons';
import Separator from '../../components/Separator';
import strings from '../../../assets/lang/strings';
import { tailwind } from '../../helpers/designSystem';

function DeleteItemModal(props: Reducers) {
  const selectedItems = props.filesState.selectedItems
  const currentFolderId = props.filesState.folderContent && props.filesState.folderContent.currentFolder
  const [isOpen, setIsOpen] = useState(props.layoutState.showDeleteModal)

  useEffect(() => {
    setIsOpen(props.layoutState.showDeleteModal)
  }, [props.layoutState.showDeleteModal])

  const handleDeleteSelectedItem = () => {
    props.dispatch(fileActions.deleteItems([props.filesState.focusedItem], currentFolderId))
  }

  return (
    <Modal
      isOpen={isOpen}
      swipeArea={2}
      coverScreen={Platform.OS === 'android'}
      onClosed={() => {
        props.dispatch(layoutActions.closeDeleteModal())
        setIsOpen(false)
      }}
      position='bottom'
      style={styles.modalContainer}
    >
      <View>

        <View style={tailwind('h-1 bg-neutral-30 m-2 w-16 self-center')}></View>

        <View>
          <Text style={{
            textAlign: 'center',
            fontFamily: 'NeueEinstellung-Bold'
          }}>{strings.modals.delete_modal.title}</Text>
        </View>

        <View>
          <Text style={{
            textAlign: 'center',
            fontFamily: 'NeueEinstellung-Regular',
            margin: 10
          }}>{strings.modals.delete_modal.warning}</Text>
        </View>

        <Separator />

        <View>
          <TouchableHighlight
            underlayColor={'#eee'}
            onPress={() => {
              handleDeleteSelectedItem();
              setIsOpen(false)
            }}>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', padding: 20, paddingLeft: 20 }}>
              <View style={{ paddingRight: 10 }}>
                <Unicons.UilTrashAlt color="#DA1E28" size={30} />
              </View>
              <View>
                <Text style={{ fontFamily: 'NeueEinstellung-Regular', color: '#DA1E28' }}>{strings.modals.delete_modal.confirm_delete}</Text>
              </View>
            </View>
          </TouchableHighlight>
        </View>

        <Separator />

        <View>
          <TouchableHighlight
            underlayColor={'#eee'}
            style={{
              alignItems: 'center',
              padding: 20
            }}
            onPress={() => {
              setIsOpen(false)
            }}>
            <Text style={{ color: '#DA1E28' }}>{strings.generic.cancel}</Text>
          </TouchableHighlight>
        </View>

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: hp('90%') < 550 ? 550 : Math.min(320, hp('90%')),
    marginTop: wp('12')
  }
})

const mapStateToProps = (state: any) => {
  return { ...state }
};

export default connect(mapStateToProps)(DeleteItemModal)