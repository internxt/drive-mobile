import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { connect } from 'react-redux';

interface OutOfSpaceProps {
    layoutState?: any
    filesState?: any
    authenticationState?: any
    dispatch?: any,
    navigation?: any
}

function OutOfSpace(props: OutOfSpaceProps) {

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>
                    Run out of space
        </Text>

        <Text style={styles.subtitle}>
                    You have currently used 3GB of storage. To start uploading more files, please upgrade your storage plan.
        </Text>
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.button}
          onPress={() => {
            props.navigation.replace('FileExplorer')
          }}
        >
          <Text style={styles.buttonText}>Close</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.blue]}
          onPress={() => {
            props.navigation.replace('Storage')
          }}
        >
          <Text style={[styles.buttonText, styles.white]}>Upgrade</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    justifyContent: 'center',
    height: '100%',
    backgroundColor: 'white'
  },

  titleContainer: {
    alignSelf: 'flex-start',
    marginHorizontal: wp('6'),
    marginVertical: wp('15')
  },

  title: {
    fontFamily: 'CerebriSans-Bold',
    fontSize: 27,
    letterSpacing: -0.5,
    color: '#000000'
  },

  subtitle: {
    fontFamily: 'CerebriSans-Regular',
    fontSize: 17,
    lineHeight: 23,
    letterSpacing: -0.1,

    marginTop: 15
  },

  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly'
  },

  button: {
    height: 50,
    width: wp('42'),
    borderRadius: 4,
    borderWidth: 2,
    backgroundColor: '#fff',
    borderColor: 'rgba(151, 151, 151, 0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },

  blue: {
    backgroundColor: '#4585f5',
    borderWidth: 0
  },

  buttonText: {
    fontFamily: 'CerebriSans-Bold',
    fontSize: 16,
    letterSpacing: -0.2,
    color: '#5c6066'
  },

  white: {
    color: 'white'
  }
})

const mapStateToProps = (state: any) => {
  return { ...state }
};

export default connect(mapStateToProps)(OutOfSpace)