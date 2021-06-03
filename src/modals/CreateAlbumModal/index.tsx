import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { TextInput, TouchableOpacity } from 'react-native-gesture-handler'
import Modal from 'react-native-modalbox';
import { tailwind, getColor } from '../../tailwind'
import { layoutActions } from '../../redux/actions';
import CrossBlue from '../../../assets/icons/photos/cross-blue.svg'
import FolderWithCross from '../../../assets/icons/photos/folder-with-cross-blue.svg'
import SimpleToast from 'react-native-simple-toast';
import { IAPIPhoto } from '../../types/api/photos/IApiPhoto';
import { normalize } from '../../helpers';

interface CreateAlbumProps {
  dispatch: any
  showAlbumModal: boolean
  albumTitle: string
  setAlbumTitle: React.Dispatch<React.SetStateAction<string>>
}

export interface IAPIAlbum {
  createdAt: Date
  id: number
  name: string
  photos: IAPIPhoto[]
  updatedAt: Date
  userId: number
}

export interface ISaveableAlbum {
  name: string
  photos: number[]
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

        <Text style={[tailwind('w-3/5 text-center text-base font-averta-regular text-gray-70'), { fontSize: normalize(16) }]}>Create new album</Text>

        <View style={tailwind('w-1/5 items-end')}>
          <TouchableOpacity style={tailwind('w-14 h-8 items-end justify-center')}
            onPress={() => setIsOpen(false)}>
            <CrossBlue height={normalize(13)} width={normalize(13)} style={tailwind('mr-2')} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={tailwind('mt-4')}>
        <View style={tailwind('absolute z-10 mt-1.5 ml-3')}>
          <FolderWithCross width={normalize(17)} height={normalize(17)} />
        </View>

        <TextInput
          style={[tailwind('w-full h-8 bg-gray-10 text-sm font-averta-regular pl-10'), { fontSize: normalize(13) }]}
          placeholderTextColor={getColor('gray-50')}
          placeholder='Name your memories'
          onChangeText={value => setAlbumTitle(value)}
          value={albumTitle}
          autoCapitalize='none'
          autoCorrect={false}
        />
      </View>

      <TouchableOpacity style={tailwind('self-center mt-8 bg-blue-60 px-4 py-3 rounded-full')}
        onPress={() => {
          if (!albumTitle) {
            SimpleToast.show('The album name can not be empty')
            return
          }
          setIsOpen(false)
          dispatch(layoutActions.openSelectPhotosForAlbumModal())
        }}
      >
        <Text style={[tailwind('text-center text-base text-white font-averta-regular'), { fontSize: normalize(14) }]}>Add photos to album</Text>
      </TouchableOpacity>
    </Modal>
  );
}

export default React.memo(CreateAlbumModal)