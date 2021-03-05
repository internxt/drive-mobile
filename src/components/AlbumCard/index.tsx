import * as React from 'react';
import { FlatList, Image, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Dispatch } from 'redux';
import { AuthenticationState } from '../../redux/reducers/authentication.reducer';
import { LayoutState } from '../../redux/reducers/layout.reducer';
import { PhotosState } from '../../redux/reducers/photos.reducer';

export interface AlbumProps {
  style?: StyleProp<ViewStyle>
  album?: any
  withTitle: boolean
  navigation: any
  photosState: PhotosState
  dispatch: Dispatch
  layoutState: LayoutState
  authenticationState: AuthenticationState
}

// TODO: Add album param
export function AlbumCard(props: AlbumProps): JSX.Element {

  const photos = props.photosState && props.photosState.localPhotos;

  const keyExtractor = (item: any, index: any) => index;
  const renderItem = ({ item }) => (
    <Image style={styles.icon} source={item} />
  );

  const bigImg = 'file:///Users/internxt/Library/Developer/CoreSimulator/Devices/5238DEFF-AC91-43B6-AF4D-185C87891566/data/Media/DCIM/100APPLE/IMG_0199.PNG';
  const img1 = 'file:///Users/internxt/Library/Developer/CoreSimulator/Devices/5238DEFF-AC91-43B6-AF4D-185C87891566/data/Media/DCIM/100APPLE/IMG_0200.PNG';
  const img2 = 'file:///Users/internxt/Library/Developer/CoreSimulator/Devices/5238DEFF-AC91-43B6-AF4D-185C87891566/data/Media/DCIM/100APPLE/IMG_0195.PNG';

  //const newList = photos.slice(3, 12);

  return (
    <View style={props.withTitle ? styles.cont : styles.contModal}>
      <View style={styles.wrapContent}>
        <View style={props.withTitle ? styles.container : styles.containerModal}>
          <View>
            <Image style={styles.bigIcon} source={{ uri: bigImg }} />
            <View style={styles.downimg}>
              <Image style={styles.icon} source={{ uri: img1 }} />
              <Image style={styles.icon} source={{ uri: img2 }} />
            </View>
          </View>

          <View>
            <FlatList
              style={styles.photoGrid}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              data={photos}
              horizontal={false}
              numColumns={3}
            />
          </View>
        </View>
      </View>

      { props.withTitle
        ? <View style={styles.albumTitle}>
          <Text>
            Utah Trip Last Summer
          </Text>
        </View>
        : <View></View>
      }

    </View>
  )

}

const styles = StyleSheet.create({
  cont: {
    marginTop: 22,
    marginLeft: 10
  },
  contModal: {
    marginRight: 0,
    paddingHorizontal: 19,
    paddingVertical: 19
  },
  containerModal: {
    display: 'flex',
    backgroundColor: '#fff',
    flexWrap: 'wrap',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9,
    paddingTop: 12.6,
    paddingBottom: 12.6,
    paddingLeft: 12.6,
    paddingRight: 7.6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  container: {
    display: 'flex',
    backgroundColor: '#fff',
    flexWrap: 'wrap',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9,
    paddingTop: 12.6,
    paddingBottom: 12.6,
    paddingLeft: 12.6,
    paddingRight: 7.6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5
    },
    shadowOpacity: 0.36,
    shadowRadius: 6.68,
    elevation: 11

  },
  wrapContent: {
    alignSelf: 'baseline'
  },
  icon: {
    width: 58,
    height: 58,
    resizeMode: 'cover',
    borderRadius: 5,
    marginRight: 5,
    marginBottom: 5
  },
  bigIcon: {
    width: 121,
    height: 121,
    resizeMode: 'cover',
    borderRadius: 5
  },
  downimg: {
    display: 'flex',
    flexDirection: 'row',
    marginRight: 1,
    marginTop: 5
  },
  albumTitle: {
    fontFamily: 'Averta-Regular',
    fontSize: 15,
    letterSpacing: -0.14,
    marginLeft: 16,
    marginTop: 20,
    marginBottom: 15,
    color: '#2a2c35'
  },
  photoGrid: {
    flex: 1,
    alignContent: 'flex-start',
    flexWrap: 'wrap'
  }
});

export default AlbumCard;