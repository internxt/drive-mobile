import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Text, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { DEVICE_WIDTH, IPhotosToRender } from '../../screens/PhotoGallery';
import { tailwind } from '../../tailwind'
import { IStoreReducers } from '../../types/redux';
import { connect } from 'react-redux';
export interface AlbumProps {
  album: { hashes: string[], name: string }
  photosToRender: IPhotosToRender
}

export function AlbumCard({ album, photosToRender }: AlbumProps): JSX.Element {
  const [localUri, setLocalUri] = useState('')
  const [albums, setAlbums] = useState<IPhotosToRender>({})
  const [albumCover, setAlbumCover] = useState('')
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const currentPhotos = photosToRender
    const albumPhotos: IPhotosToRender = album.hashes.reduce((acc, hash) => {
      acc[hash] = currentPhotos[hash]

      return acc
    }, {})
    const cover = albumPhotos[album.hashes[0]].localUri

    setAlbumCover(cover)
    setAlbums(albumPhotos)
  }, [])

  return (
    <TouchableOpacity onPress={() => { }}>
      <View style={{ width: (DEVICE_WIDTH - 40) / 3, height: (DEVICE_WIDTH + 10) / 3 }}>
        <View style={tailwind('m-0.5')}>
          <Image
            onLoadEnd={() => setIsLoaded(true)}
            style={tailwind('self-center rounded-md w-full h-24')}
            resizeMode='cover'
            source={{ uri: albumCover }}
          />
        </View>

        {!isLoaded ?
          <ActivityIndicator color='gray' size='small' style={tailwind('absolute')} />
          : null
        }

        <Text numberOfLines={1} style={tailwind('font-averta-semibold text-gray-80 text-sm -mb-1 ml-1')}>
          Photos main
        </Text>

        <Text numberOfLines={1} style={tailwind('font-averta-regular text-gray-50 text-sm ml-1')} >
          12.350 photos
        </Text>
      </View>
    </TouchableOpacity>
  )
}

const mapStateToProps = (state: IStoreReducers) => {
  return {
    photosToRender: state.photosState.photosToRender
  };
}

export default connect(mapStateToProps)(AlbumCard);