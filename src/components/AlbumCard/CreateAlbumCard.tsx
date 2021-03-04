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
    width: wp('87'),
    paddingBottom: 8
  },
  card: {
    height: wp('50'),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: '#f5f5f5',
    borderColor: 'white',
    borderWidth: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginHorizontal: 4
  },
  image: {
    height: 25,
    width: 38,
    backgroundColor: '#0084ff'
  },
  title: {
    fontFamily: 'Averta-Semibold',
    marginTop: 14,
    fontSize: 16,
    color: 'black'
  }
});

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(CreateAlbumCard);