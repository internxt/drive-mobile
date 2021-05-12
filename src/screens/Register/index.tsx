import React, { useEffect, useState } from 'react'
import { StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import { deviceStorage, normalize } from '../../helpers';
import { userActions } from '../../redux/actions';
import { AuthenticationState } from '../../redux/reducers/authentication.reducer';
import Intro from '../Intro'
import { validateEmail } from '../Login/access';
import RegisterStep1 from './RegisterStep1';
import RegisterStep2 from './RegisterStep2';
import RegisterStep3 from './RegisterStep3';
import { isNullOrEmpty, isStrongPassword } from './registerUtils';

interface RegisterProps {
  authenticationState: AuthenticationState
  navigation: any
  dispatch: any
}

export interface IRegisterScreenStyles {
  button: any
  buttonBlock: any
  buttonDisabled: any
  buttonFooterWrapper: any
  buttonLeft: any
  buttonOff: any
  buttonOffLabel: any
  buttonOn: any
  buttonOnLabel: any
  buttonRight: any
  buttonWrapper: any
  container: any
  containerCentered: any
  containerHeader: any
  flexRow: any
  halfOpacity: any
  input: any
  inputWrapper: any
  showInputFieldsWrapper: any
  textDisclaimer: any
  textStorePassword: any
  textStorePasswordContainer: any
  textTip: any
  title: any
}

function Register(props: RegisterProps): JSX.Element {
  const [registerStep, setRegisterStep] = useState(1);
  const [showIntro, setShowIntro] = useState(true);

  // Register form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const isValidEmail = validateEmail(email);
  const isValidFirstName = !isNullOrEmpty(firstName)
  const isValidLastName = !isNullOrEmpty(lastName)

  useEffect(() => {
    if (props.authenticationState.loggedIn === true) {
      const rootFolderId = props.authenticationState.user.root_folder_id;

      props.navigation.replace('FileExplorer', {
        folderId: rootFolderId
      })
    } else {
      (async () => {
        const xToken = await deviceStorage.getItem('xToken')
        const xUser = await deviceStorage.getItem('xUser')

        if (xToken && xUser) {
          props.dispatch(userActions.localSignIn(xToken, xUser))
        }
      })()
    }
  }, [props.authenticationState.loggedIn, props.authenticationState.token])

  if (showIntro) {
    return <Intro onFinish={() => setShowIntro(false)} />;
  }

  if (registerStep === 1) {
    const isValidStep = isValidFirstName && isValidLastName && isValidEmail;

    return (
      <RegisterStep1
        styles={styles}
        firstName={firstName}
        setFirstName={setFirstName}
        lastName={lastName}
        setLastName={setLastName}
        email={email}
        setEmail={setEmail}
        isValidFirstName={isValidFirstName}
        isValidLastName={isValidLastName}
        isValidEmail={isValidEmail}
        isvalidStep={isValidStep}
        setRegisterStep={setRegisterStep}
        navigation={props.navigation}
      />
    )
  }

  if (registerStep === 2) {
    return <RegisterStep2 styles={styles} setRegisterStep={setRegisterStep} />
  }

  if (registerStep === 3) {
    const isValidPassword = isStrongPassword(password);
    const isValidStep = (password === confirmPassword) && isValidPassword;

    return (
      <RegisterStep3
        styles={styles}
        firstName={firstName}
        lastName={lastName}
        email={email}
        password={password}
        setPassword={setPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        isValidStep={isValidStep}
        isValidPassword={isValidPassword}
        isStrongPassword={isStrongPassword}
        setRegisterStep={setRegisterStep}
        navigation={props.navigation}
        dispatch={props.dispatch}
      />
    )
  }
  return <></>
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#4585f5',
    borderRadius: 3.4,
    height: normalize(55),
    justifyContent: 'center',
    marginBottom: normalize(10),
    width: normalize(130)
  },
  buttonBlock: {
    width: '100%'
  },
  buttonDisabled: {
    opacity: 0.5
  },
  buttonFooterWrapper: {
    marginTop: normalize(20)
  },
  buttonLeft: {
    marginRight: normalize(10)
  },
  buttonOff: {
    alignItems: 'center',
    backgroundColor: '#f2f2f2'
  },
  buttonOffLabel: {
    color: '#5c5c5c',
    fontFamily: 'CerebriSans-Medium',
    fontSize: normalize(15),
    textAlign: 'center'
  },
  buttonOn: {
    alignItems: 'center',
    backgroundColor: '#4585f5'
  },
  buttonOnLabel: {
    color: '#fff',
    fontFamily: 'CerebriSans-Medium',
    fontSize: normalize(15),
    textAlign: 'center'
  },
  buttonRight: {
    marginLeft: normalize(10)
  },
  buttonWrapper: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: normalize(30)
  },
  container: {
    backgroundColor: '#FFFFFF',
    flex: 1,
    justifyContent: 'center',
    padding: normalize(20)
  },
  containerCentered: {
    alignSelf: 'center',
    height: normalize(600),
    justifyContent: 'center',
    width: '100%'
  },
  containerHeader: {
    borderWidth: 0
  },
  flexRow: {
    flexDirection: 'row'
  },
  halfOpacity: {
    opacity: 0.5
  },
  input: {
    color: '#000',
    flex: 1,
    fontFamily: 'CerebriSans-Medium',
    fontSize: normalize(15),
    letterSpacing: -0.2,
    paddingLeft: 20
  },
  inputWrapper: {
    borderColor: '#c9c9c9',
    borderRadius: 5,
    borderWidth: 1,
    height: normalize(55),
    justifyContent: 'center',
    marginBottom: normalize(15)
  },
  showInputFieldsWrapper: {
    justifyContent: 'center'
  },
  textDisclaimer: {
    color: '#737880',
    fontFamily: 'CerebriSans-Regular',
    fontSize: normalize(15),
    letterSpacing: -0.1,
    marginTop: -15,
    textAlign: 'justify'
  },
  textStorePassword: {
    color: '#737880',
    flex: 1,
    fontFamily: 'CerebriSans-Regular',
    fontSize: normalize(15),
    paddingLeft: normalize(9)
  },
  textStorePasswordContainer: {
    backgroundColor: '#f7f7f7',
    marginTop: normalize(30),
    padding: normalize(23)
  },
  textTip: {
    color: '#737880',
    flex: 1,
    fontFamily: 'CerebriSans-Regular',
    fontSize: normalize(15),
    paddingLeft: normalize(9)
  },
  title: {
    color: '#000',
    fontFamily: 'CerebriSans-Bold',
    fontSize: normalize(22),
    letterSpacing: -1.7,
    marginBottom: normalize(30),
    marginTop: normalize(12)
  }
});

const mapStateToProps = (state: any) => {
  return { authenticationState: state.authenticationState };
};

export default connect(mapStateToProps)(Register)