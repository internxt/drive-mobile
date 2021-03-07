import * as React from 'react';
import { FlatList, Image, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

export interface AlbumProps {
  style?: StyleProp<ViewStyle>
  album?: any
  withTitle: boolean
  navigation: any
  photosState?: any
  dispatch?: any,
  layoutState?: any
  authenticationState?: any
}

// TODO: Add album param
export function AlbumCard(props: AlbumProps): JSX.Element {

  const photos = props.photosState.photos;

  const keyExtractor = (item: any, index: any) => index;
  const renderItem = ({ item }) => (
    <Image style={styles.icon} source={item} />
  );

  const bigImg = photos[0];
  const img1 = photos[1];
  const img2 = photos[2];

  const newList = photos.slice(3, 12);

  return (
    <View style={props.withTitle ? styles.cont : styles.contModal}>

      <View style={styles.wrapContent}>
        <View style={props.withTitle ? styles.container : styles.containerModal}>
          <View>
            <Image style={styles.bigIcon} source={bigImg} />
            <View style={styles.downimg}>
              <Image style={styles.icon} source={img1} />
              <Image style={styles.icon} source={img2} />
            </View>
          </View>

          <View>
            <FlatList
              style={styles.photoGrid}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              data={newList}
              horizontal={false}
              numColumns={3}
            ></FlatList>
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
  albumTitle: {
    color: '#2a2c35',
    fontFamily: 'Averta-Regular',
    fontSize: 15,
    letterSpacing: -0.14,
    marginBottom: 15,
    marginLeft: 16,
    marginTop: 20
  },
  bigIcon: {
    borderRadius: 5,
    height: 121,
    resizeMode: 'cover',
    width: 121
  },
  cont: {
    marginLeft: 10,
    marginTop: 22
  },
  contModal: {
    marginRight: 0,
    paddingHorizontal: 19,
    paddingVertical: 19
  },
  container: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 9,
    display: 'flex',
    elevation: 11,
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: 12.6,
    paddingLeft: 12.6,
    paddingRight: 7.6,
    paddingTop: 12.6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5
    },
    shadowOpacity: 0.36,
    shadowRadius: 6.68

  },
  containerModal: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 9,
    display: 'flex',
    elevation: 5,
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: 12.6,
    paddingLeft: 12.6,
    paddingRight: 7.6,
    paddingTop: 12.6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84
  },
  downimg: {
    display: 'flex',
    flexDirection: 'row',
    marginRight: 1,
    marginTop: 5
  },
  icon: {
    borderRadius: 5,
    height: 58,
    marginBottom: 5,
    marginRight: 5,
    resizeMode: 'cover',
    width: 58
  },
  photoGrid: {
    alignContent: 'flex-start',
    flex: 1,
    flexWrap: 'wrap'
  },
  wrapContent: {
    alignSelf: 'baseline'
  }
});

export default AlbumCard;