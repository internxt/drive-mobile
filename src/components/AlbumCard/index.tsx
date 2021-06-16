import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View, TouchableOpacity } from 'react-native';
import { DEVICE_WIDTH, IPhotosToRender } from '../../screens/PhotoGallery';
import { tailwind } from '../../tailwind'
import { IStoreReducers } from '../../types/redux';
import { connect } from 'react-redux';
import { normalize } from '../../helpers';
import FastImage from 'react-native-fast-image';
export interface AlbumProps {
  album: { hashes: string[], name: string }
  photosToRender: IPhotosToRender
  handleAlbumOnPress: (albumPhotos: IPhotosToRender) => void
}

export function AlbumCard({ album, photosToRender, handleAlbumOnPress }: AlbumProps): JSX.Element {
  const [albumPhotos, setAlbumPhotos] = useState<IPhotosToRender>({})
  const [albumCover, setAlbumCover] = useState('')
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const currentPhotos = photosToRender
    const albumPhotos: IPhotosToRender = album.hashes.reduce((acc, hash) => {
      acc[hash] = currentPhotos[hash]

      return acc
    }, {})
    const cover = albumPhotos[album.hashes[0]] ? albumPhotos[album.hashes[0]].localUri : undefined

    setAlbumCover(cover)
    setAlbumPhotos(albumPhotos)
  }, [])

  return (
    <TouchableOpacity style={tailwind('mb-0.5')} onPress={() => {
      handleAlbumOnPress(albumPhotos)
    }}>
      <View style={{ width: (DEVICE_WIDTH - 40) / 3 }}>
        <View style={tailwind('m-0.5')}>
          <FastImage
            onLoadEnd={() => setIsLoaded(true)}
            style={tailwind('self-center rounded-md w-full h-24')}
            resizeMode='cover'
            source={albumCover ? { uri: albumCover } : { uri: '' }}
          />
        </View>

        {!isLoaded ?
          <ActivityIndicator color='gray' size='small' style={tailwind('absolute')} />
          : null
        }

        <Text numberOfLines={1} style={[tailwind('font-averta-semibold text-gray-80 text-sm -mb-1 ml-1'), { fontSize: normalize(12) }]}>
          {album.name}
        </Text>

        <Text numberOfLines={1} style={[tailwind('font-averta-regular text-gray-50 text-sm ml-1 mt-0.5'), { fontSize: normalize(12) }]} >
          {album.hashes.length}
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