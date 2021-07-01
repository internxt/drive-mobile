import React, { useEffect, useState } from 'react';
import { Text, View, TouchableOpacity, TextInput } from 'react-native';
import Modal from 'react-native-modalbox';
import { tailwind, getColor } from '../../tailwind'
import { layoutActions } from '../../redux/actions';
import CrossBlue from '../../../assets/icons/photos/cross-blue.svg'
import FolderWithCross from '../../../assets/icons/photos/folder-with-cross-blue.svg'
import SimpleToast from 'react-native-simple-toast';
import { normalize } from '../../helpers';
import strings from '../../../assets/lang/strings';

interface CreateAlbumProps {
  dispatch: any
  showAlbumModal: boolean
  albumTitle: string
  setAlbumTitle: React.Dispatch<React.SetStateAction<string>>
}

function CreateAlbumModal({ dispatch, showAlbumModal, albumTitle, setAlbumTitle }: CreateAlbumProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(showAlbumModal)

  useEffect(() => {
    setIsOpen(showAlbumModal)
  }, [showAlbumModal])

  return (
    <Modal
      isOpen={isOpen}
      position='bottom'
      swipeArea={40}
      style={tailwind('h-64 rounded-t-3xl px-10')}
      onClosed={() => dispatch(layoutActions.closeCreateAlbumModal())}
    >
      <View style={tailwind('self-center bg-blue-60 rounded h-1 w-24 mt-5')} />

      <View style={tailwind('flex-row mt-5 items-center')}>
        <View style={tailwind('w-1/5')} />

        <Text style={[tailwind('w-3/5 text-center text-base font-averta-regular text-gray-70'), { fontSize: normalize(16) }]}>
          {strings.screens.photos.modals.create_album.title}
        </Text>

        <View style={tailwind('w-1/5 items-end')}>
          <TouchableOpacity style={tailwind('w-14 h-8 items-end justify-center')}
            onPress={() => setIsOpen(false)}>
            <CrossBlue height={normalize(13)} width={normalize(13)} style={tailwind('mr-2')} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={tailwind('mt-4')}>
        <View style={tailwind('absolute z-10 mt-2 ml-3')}>
          <FolderWithCross width={normalize(17)} height={normalize(17)} />
        </View>

        <TextInput
          style={[tailwind('w-full h-9 bg-gray-10 text-xs font-averta-regular pl-10'), { fontSize: normalize(13) }]}
          placeholderTextColor={getColor('gray-50')}
          placeholder={strings.screens.photos.modals.create_album.name_input}
          onChangeText={value => setAlbumTitle(value)}
          value={albumTitle}
          autoCapitalize='none'
          autoCorrect={false}
        />
      </View>

      <TouchableOpacity style={tailwind('self-center mt-8 bg-blue-60 px-4 py-3 rounded-full')}
        onPress={() => {
          if (!albumTitle) {
            return SimpleToast.show(strings.screens.photos.modals.create_album.name_error)
          }
          setIsOpen(false)
          dispatch(layoutActions.openSelectPhotosForAlbumModal())
        }}
      >
        <Text style={[tailwind('text-center text-base text-white font-averta-regular'), { fontSize: normalize(14) }]}>
          {strings.screens.photos.modals.create_album.button}
        </Text>
      </TouchableOpacity>
    </Modal>
  );
}

export default React.memo(CreateAlbumModal)