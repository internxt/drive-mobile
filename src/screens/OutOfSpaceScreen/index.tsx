import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { NavigationStackProp } from 'react-navigation-stack';
import strings from '../../../assets/lang/strings';
import { AppScreen } from '../../types';

function OutOfSpaceScreen(): JSX.Element {
  const navigation = useNavigation<NavigationStackProp>();

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{strings.modals.out_of_space_modal.title} </Text>

        <Text style={styles.subtitle}>{strings.modals.out_of_space_modal.subtitle}</Text>
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            navigation.goBack();
          }}
        >
          <Text style={styles.buttonText}>{strings.components.buttons.cancel}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.blue]}
          onPress={() => {
            navigation.replace(AppScreen.Storage);
          }}
        >
          <Text style={[styles.buttonText, styles.white]}>{strings.components.buttons.upgrade}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  blue: {
    backgroundColor: '#4585f5',
    borderWidth: 0,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: 'rgba(151, 151, 151, 0.2)',
    borderRadius: 4,
    borderWidth: 2,
    height: 50,
    justifyContent: 'center',
    width: wp('42'),
  },
  buttonText: {
    color: '#5c6066',
    fontFamily: 'NeueEinstellung-Bold',
    fontSize: 16,
    letterSpacing: -0.2,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  container: {
    backgroundColor: 'white',
    height: '100%',
    justifyContent: 'center',
  },
  subtitle: {
    fontFamily: 'NeueEinstellung-Regular',
    fontSize: 17,
    letterSpacing: -0.1,
    lineHeight: 23,
    marginTop: 15,
  },
  title: {
    color: '#000000',
    fontFamily: 'NeueEinstellung-Bold',
    fontSize: 27,
    letterSpacing: -0.5,
  },
  titleContainer: {
    alignSelf: 'flex-start',
    marginHorizontal: wp('6'),
    marginVertical: wp('15'),
  },
  white: {
    color: 'white',
  },
});

export default OutOfSpaceScreen;
