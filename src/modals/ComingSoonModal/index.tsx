import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Modal from 'react-native-modalbox';
import { widthPercentageToDP } from 'react-native-responsive-screen';
import { connect } from 'react-redux';
import strings from '../../../assets/lang/strings';
import { layoutActions } from '../../redux/actions';
import { Reducers } from '../../redux/reducers/reducers';
interface ComingSoonProps extends Reducers {
    navigation: any
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
          <Text style={styles.title}>{strings.modals.coming_soon_modal.title}</Text>
        </View>

        <Text style={styles.subtitle}>{strings.modals.coming_soon_modal.subtitle}</Text>
      </View>

      <View style={styles.buttonContainer}>

        <TouchableOpacity style={[styles.button, styles.blue]} onPress={() => {
          setIsOpen(false)
        }}>
          <Text style={[styles.text, styles.white]}>{strings.modals.coming_soon_modal.got_it}</Text>
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
    fontFamily: 'NeueEinstellung-Bold',
    fontSize: 16
  },
  textContainer: {
    paddingHorizontal: 30
  },
  title: {
    color: 'black',
    fontFamily: 'NeueEinstellung-Bold',
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