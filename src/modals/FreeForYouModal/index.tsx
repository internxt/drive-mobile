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
  blue: {
    backgroundColor: '#4585f5'
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: 'rgba(151, 151, 151, 0.2)',
    borderRadius: 4,
    borderWidth: 2,
    height: 50,
    justifyContent: 'center',
    width: wp('35')
  },
  buttonText: {
    color: '#5c6066',
    fontFamily: 'CerebriSans-Bold',
    fontSize: 16
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    width: '80%'
  },
  mainContainer: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    width: '100%'
  },
  subtitle: {
    color: '#737880',
    fontSize: 17,
    marginTop: 15
  },
  textContainer: {
    paddingHorizontal: 30
  },
  title: {
    color: 'black',
    fontFamily: 'CerebriSans-Bold',
    fontSize: 27
  },
  white: {
    color: '#fff'
  }
})

const mapStateToProps = (state: any) => {
  return { ...state }
};

export default connect(mapStateToProps)(FreeForYouModal)