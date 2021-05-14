import * as React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { connect } from 'react-redux';
import { getIcon } from '../../helpers/getIcon';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';

export interface ICreateAlbum {
  navigation: any
}

// TODO: Add album param
function CreateAlbumCard(props: ICreateAlbum): JSX.Element {
  const img = getIcon('create');

  return (
    <TouchableOpacity
      style={styles.albumCard}
      onPress={() => {
        props.navigation.push('CreateAlbum')
      }}
    >
      <View style={styles.card}>
        <Image source={img} style={styles.image} />
        <Text style={styles.title}>
          Create New Album
        </Text>

      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  albumCard: {
    marginTop: 24,
    paddingBottom: 8,
    width: wp('87')
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderColor: 'white',
    borderRadius: 9,
    borderRadius: 9,
    borderWidth: 12,
    display: 'flex',
    elevation: 5,
    elevation: 5,
    height: wp('50'),
    justifyContent: 'center',
    marginHorizontal: 4,
    marginHorizontal: 4,
    paddingVertical: 57,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84
  },
  image: {
    backgroundColor: '#0084ff',
    height: 25,
    width: 38
  },
  title: {
    color: 'black',
    fontFamily: 'Averta-Semibold',
    fontSize: 16,
    marginTop: 14
  }
});

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(CreateAlbumCard);