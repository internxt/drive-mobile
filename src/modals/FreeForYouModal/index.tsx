import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import Modal from 'react-native-modalbox'
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { layoutActions } from '../../redux/actions';

interface IFreeForYou {
  layoutState: any
  dispatch: any
  navigation: any
}

function FreeForYouModal(props: IFreeForYou) {
  const [isOpen, setIsOpen] = useState(props.layoutState.showFreeForYouModal)

  useEffect(() => {
    setIsOpen(props.layoutState.showFreeForYouModal)
  }, [props.layoutState.showFreeForYouModal])

  return (
    <Modal swipeToClose={false} onClosed={() => props.dispatch(layoutActions.closeFreeForYouModal())} isOpen={isOpen} style={styles.mainContainer}>
      <View style={styles.textContainer}>
        <Text style={styles.title}>
          Limited-time offer
        </Text>

        <Text style={styles.subtitle}>
          Psst! For a very limited time, you can upgrade to any of our bigger storage plans, for free for a whole month.
          Cancel anytime. Experience better.
        </Text>
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.button}
          onPress={() => {
            setIsOpen(false)
          }}
        >
          <Text style={styles.buttonText}>Close</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.blue]}
          onPress={() => {
            setIsOpen(false)
            props.navigation.replace('Storage')
          }}
        >
          <Text style={[styles.buttonText, styles.white]}>Upgrade</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  mainContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    width: '100%'
  },
  textContainer: {
    paddingHorizontal: 30
  },
  title: {
    fontSize: 27,
    fontFamily: 'CerebriSans-Bold',
    color: 'black'
  },
  subtitle: {
    fontSize: 17,
    color: '#737880',
    marginTop: 15
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '80%',
    marginTop: 20
  },
  button: {
    height: 50,
    width: wp('35'),
    borderRadius: 4,
    borderWidth: 2,
    backgroundColor: '#fff',
    borderColor: 'rgba(151, 151, 151, 0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  blue: {
    backgroundColor: '#4585f5'
  },
  buttonText: {
    color: '#5c6066',
    fontFamily: 'CerebriSans-Bold',
    fontSize: 16
  },
  white: {
    color: '#fff'
  }
})

const mapStateToProps = (state: any) => {
  return { ...state }
};

export default connect(mapStateToProps)(FreeForYouModal)