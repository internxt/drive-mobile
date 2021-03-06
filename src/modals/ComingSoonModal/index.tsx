import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import Modal from 'react-native-modalbox';
import { widthPercentageToDP } from 'react-native-responsive-screen';
import { connect } from 'react-redux';
import { layoutActions } from '../../redux/actions';
import { LayoutState } from '../../redux/reducers/layout.reducer';

export interface ComingSoon {
    navigation: any
    layoutState: LayoutState
    dispatch: any
}

const ComingSoonModal = (props: ComingSoon) => {
  const [isOpen, setIsOpen] = useState(props.layoutState.showComingSoonModal)

  useEffect(() => {
    props.layoutState.showComingSoonModal ? setIsOpen(true) : null

  }, [props.layoutState])

  return (
    <Modal
      isOpen={isOpen}
      swipeArea={2}
      onClosed={() => {
        props.dispatch(layoutActions.closeComingSoonModal())
        setIsOpen(false)
      }}
      position='center'
      style={styles.modalContainer}
    >
      <View style={styles.textContainer}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Coming soon!</Text>
        </View>

        <Text style={styles.subtitle}>Our fantastic devs are working on it, so stay tuned!</Text>
      </View>

      <View style={styles.buttonContainer}>

        <TouchableOpacity style={[styles.button, styles.blue]} onPress={() => {
          setIsOpen(false)
        }}>
          <Text style={[styles.text, styles.white]}>Got it!</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    width: '100%'
  },
  textContainer: {
    paddingHorizontal: 30
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end'
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '80%',
    marginTop: 30
  },
  button: {
    height: 50,
    width: widthPercentageToDP('35'),
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
  text: {
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
}

export default connect(mapStateToProps)(ComingSoonModal)