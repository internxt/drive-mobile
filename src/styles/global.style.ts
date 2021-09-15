import { StyleSheet } from 'react-native'
import { normalize } from '../helpers';

export default {
  buttonInputStyle: StyleSheet.create({
    wrapper: {
      marginTop: normalize(15)
    },
    button: {
      alignItems: 'center',
      alignSelf: 'stretch',
      backgroundColor: '#0F62FE',
      borderRadius: 10,
      height: 56,
      justifyContent: 'center'
    },
    block: {
      width: '100%'
    },
    label: {
      color: '#fff',
      fontFamily: 'NeueEinstellung-Regular',
      fontSize: normalize(15),
      textAlign: 'center'
    }
  }),
  textInputStyle: StyleSheet.create({
    wrapper: {
      borderColor: 'rgba(0,0,0,0.25)',
      borderRadius: 10,
      borderWidth: 1,
      height: 56,
      justifyContent: 'center',
      marginBottom: normalize(13),
      flexDirection: 'row',
      alignItems: 'center'
    },
    error: {
      borderColor: 'rgba(255,0,0,1)'
    }
  }),
  text: StyleSheet.create({
    normal: {
      color: '#253858',
      fontFamily: 'NeueEinstellung-Regular'
    },
    link: {
      color: '#0F62FE',
      fontFamily: 'NeueEinstellung-Regular'
    },
    center: {
      textAlign: 'center'
    },
    mt10: {
      marginTop: 10
    }
  }),
  image: StyleSheet.create({
    center: {
      alignItems: 'center',
      justifyContent: 'center'
    }
  }),
  container: StyleSheet.create({
    pn20: {
      padding: normalize(20)
    },
    mv20: {
      marginBottom: 20,
      marginTop: 20
    },
    pv40: {
      marginBottom: 40,
      marginTop: 40
    },
    pb40: {
      marginBottom: 40
    }
  })
}