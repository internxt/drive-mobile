import CameraRoll from '@react-native-community/cameraroll';
import React, { useEffect, useState } from 'react';
import { Image, Dimensions, View, Text, ListRenderItemInfo, SafeAreaView, TouchableOpacity, RefreshControl } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import tailwind from 'tailwind-rn';
import { Reducers } from '../../redux/reducers/reducers';
import { loadLocalPhotos } from '../../services/photos';

function Photos(props: Reducers): JSX.Element {
  const screenWidth = Dimensions.get('window').width;
  const thirdWidth = screenWidth / 3;

  const [refreshing, setRefreshing] = useState(false)
  const [photos, setPhotos] = useState<CameraRoll.PhotoIdentifier[]>([]);
  const [photoCursor, setPhotoCursor] = useState<string>();

  const loadMorePhotos = async (cursor?: any) => {
    const [loadedPhotos, nextCursor] = await loadLocalPhotos(cursor);
    const edges = loadedPhotos.edges;

    setPhotos([...photos, ...edges]);
    setPhotoCursor(nextCursor);
    setRefreshing(false)
  }

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setPhotos([]);
    }
    loadMorePhotos();
  }, []);

  return <SafeAreaView>
    <View style={tailwind('flex-row items-center justify-between absolute z-10 w-full p-3')}>
      <View>
        <Text style={tailwind('text-3xl')}>Gallery</Text>
      </View>
      <View style={tailwind('')}>
        <Text>Select</Text>
      </View>
    </View>
    <FlatList
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
        return <TouchableOpacity
          onPress={() => {
            props.navigation.push('Preview', {
              uri: item.item.node.image.uri
            })
          }}
          key={item.item.node.image.uri}
          style={[tailwind('p-0.5'), { width: thirdWidth, height: thirdWidth }]}>
          <Image
            style={tailwind('w-full h-full')}
            source={{
              uri: item.item.node.image.uri
            }} />
        </TouchableOpacity>
      }}
    />
  </SafeAreaView>;
}

const mapStateToProps = (state: Reducers) => {
  return { ...state };
};

export default connect(mapStateToProps)(Photos)
