import CameraRoll from '@react-native-community/cameraroll';
import React, { useEffect, useState } from 'react';
import { View, Text, ListRenderItemInfo, SafeAreaView, TouchableOpacity, RefreshControl, Dimensions, Image } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import { tailwind } from '../../helpers/designSystem';
import { Reducers } from '../../redux/reducers/reducers';
import { loadLocalPhotos } from '../../services/photos';
import globalStyle from '../../styles/global.style';

function Photos(props: Reducers): JSX.Element {
  const [refreshing, setRefreshing] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false);
  const [photos, setPhotos] = useState<CameraRoll.PhotoIdentifier[]>([]);
  const [photoCursor, setPhotoCursor] = useState<string>();

  const screenWidth = Dimensions.get('window').width;
  const thirdWidth = screenWidth / 3;

  const loadMorePhotos = async (cursor?: any) => {
    const [loadedPhotos, nextCursor] = await loadLocalPhotos(cursor);
    const edges = loadedPhotos.edges;

    setPhotos([...photos, ...edges]);
    setPhotoCursor(nextCursor);
    setRefreshing(false)
  }

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // setPhotos([]);
    }
    loadMorePhotos();
  }, []);

  return <SafeAreaView style={tailwind('bg-white')}>
    <View style={tailwind('flex-row items-center justify-between absolute z-10 w-full p-3')}>
      <View>
        <Text style={[tailwind('text-3xl'), globalStyle.fontWeight.medium]}>Gallery</Text>
      </View>
      <TouchableOpacity style={tailwind('bg-blue-10 px-3 py-2 rounded-3xl')}>
        <Text style={[tailwind('text-blue-60'), globalStyle.fontWeight.medium]}>Select</Text>
      </TouchableOpacity>
    </View>
    <FlatList
      showsVerticalScrollIndicator={true}
      indicatorStyle={'black'}
      refreshControl={
        <RefreshControl refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true)

            loadMorePhotos();
          }}
        />
      }
      decelerationRate={0.5}
      contentContainerStyle={tailwind('mt-16')}
      data={photos}
      numColumns={3}
      onEndReached={() => loadMorePhotos(photoCursor)}
      onEndReachedThreshold={3}
      renderItem={(item: ListRenderItemInfo<CameraRoll.PhotoIdentifier>) => {
        const uri = item.item.node.image.uri;

        return <TouchableOpacity
          onPress={() => {
            props.navigation.push('Preview', { uri })
          }}
          key={item.item.node.image.uri}
          style={[tailwind('p-0.5'), { width: thirdWidth, height: thirdWidth }]}>
          <Image
            style={tailwind('w-full h-full')}
            source={{ uri }} />
        </TouchableOpacity>
      }}
    />
  </SafeAreaView>;
}

const mapStateToProps = (state: Reducers) => {
  return { ...state };
};

export default connect(mapStateToProps)(Photos)
