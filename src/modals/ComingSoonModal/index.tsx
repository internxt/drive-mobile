import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import Modal from 'react-native-modalbox';
import { widthPercentageToDP } from 'react-native-responsive-screen';
import { connect } from 'react-redux';
import { layoutActions } from '../../redux/actions';
import { LayoutState } from '../../redux/reducers/layout.reducer';
interface ComingSoonProps {
    navigation: any
    layoutState: LayoutState
    dispatch: any
}

const ComingSoonModal = (props: ComingSoonProps) => {
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
    width: widthPercentageToDP('35')
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 30,
    width: '80%'
  },
  modalContainer: {
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
  text: {
    color: '#5c6066',
    fontFamily: 'CerebriSans-Bold',
    fontSize: 16
  },
  textContainer: {
    paddingHorizontal: 30
  },
  title: {
    color: 'black',
    fontFamily: 'CerebriSans-Bold',
    fontSize: 27
  },
  titleContainer: {
    alignItems: 'flex-end',
    flexDirection: 'row'
  },
  white: {
    color: '#fff'
  }
})

const mapStateToProps = (state: any) => {
  return { ...state }
}

export default connect(mapStateToProps)(ComingSoonModal)