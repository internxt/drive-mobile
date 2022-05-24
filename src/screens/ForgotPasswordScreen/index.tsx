import { View, Text, StyleSheet, Alert, TextInput, TouchableHighlight, TouchableWithoutFeedback } from 'react-native';
import React, { useEffect, useState } from 'react';

import { normalize } from '../../helpers';
import strings from '../../../assets/lang/strings';
import InternxtLogo from '../../../assets/logo.svg';
import { tailwind } from '../../helpers/designSystem';
import validationService from '../../services/validation';
import authService from '../../services/auth';
import { AppScreenKey, RootStackScreenProps } from '../../types';
import AppScreen from '../../components/AppScreen';

function ForgotPasswordScreen({ navigation }: RootStackScreenProps<'ForgotPassword'>): JSX.Element {
  const [currentContainer, setCurrentCointainer] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  // Get email form field
  const [email, setIsEmail] = useState('');
  const isValidEmailField = validationService.validateEmail(email);

  useEffect(() => {
    // do something after isLoading has updated
    if (isLoading === true) {
      if (!isValidEmailField) {
        setIsLoading(false);
        return Alert.alert('Warning', 'Enter a valid e-mail address');
      }
    }
  }, [isLoading]);

  const sendDeactivationEmail = () => {
    if (!isLoading) {
      setIsLoading(true);
      authService
        .sendDeactivationsEmail(email)
        .then(() => {
          setIsLoading(false);
          setCurrentCointainer(2);
        })
        .catch(() => {
          setIsLoading(false);
          return Alert.alert('Error', 'Connection to server failed');
        });
    }
  };

  if (currentContainer === 1) {
    return (
      <AppScreen safeAreaTop style={tailwind('p-5 h-full justify-center')}>
        <View style={tailwind('p-6 py-0 bg-white')}>
          <View style={isLoading ? tailwind('opacity-50') : tailwind('opacity-100')}>
            <View>
              <View style={tailwind('items-center')}>
                <InternxtLogo />
                <Text style={tailwind('text-base text-sm mt-3 text-gray-60')}>{strings.generic.security}</Text>
              </View>
              <Text style={tailwind('text-sm text-center py-5')}>
                {strings.screens.forgot_password.subtitle_1}

                <Text style={tailwind('font-bold')}>{strings.screens.forgot_password.bold}</Text>

                {strings.screens.forgot_password.subtitle_2}
              </Text>

              <View style={tailwind('input-wrapper items-stretch')}>
                <TextInput
                  style={tailwind('input pl-4')}
                  value={email}
                  onChangeText={(value) => setIsEmail(value)}
                  placeholder={strings.components.inputs.email}
                  placeholderTextColor="#666666"
                  maxLength={64}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                />
              </View>

              <View>
                <TouchableHighlight
                  style={tailwind('btn btn-primary bg-red-60 mt-3')}
                  onPress={() => sendDeactivationEmail()}
                >
                  <Text style={tailwind('text-base btn-label')}>{strings.screens.change_password.confirm}</Text>
                </TouchableHighlight>
              </View>
              <View style={tailwind('py-5')}>
                <TouchableWithoutFeedback style={tailwind('m-5')} onPress={() => navigation.navigate('SignIn')}>
                  <Text style={tailwind('text-blue-60 text-center')}> {strings.screens.SignInScreen.back}</Text>
                </TouchableWithoutFeedback>
              </View>
            </View>
          </View>
        </View>
      </AppScreen>
    );
  }

  if (currentContainer === 2) {
    return (
      <AppScreen safeAreaTop style={tailwind('p-5 h-full justify-center')}>
        <View style={tailwind('py-0 bg-white')}>
          <View style={[tailwind(''), isLoading ? tailwind('opacity-50') : {}]}>
            <View>
              <View style={tailwind('items-center pb-10')}>
                <InternxtLogo />
                <Text style={tailwind('text-base text-sm mt-3 text-gray-60')}>{strings.generic.security}</Text>
              </View>
              <Text style={tailwind('text-sm text-center')}>
                {strings.screens.deactivation_screen.subtitle_1} {strings.screens.deactivation_screen.subtitle_2}
              </Text>

              <View style={styles.buttonWrapper}>
                <TouchableHighlight
                  style={[styles.button, styles.buttonOn]}
                  underlayColor="#00aaff"
                  onPress={() => sendDeactivationEmail()}
                >
                  <Text style={styles.buttonOnLabel}>{strings.components.buttons.deactivation}</Text>
                </TouchableHighlight>
              </View>

              <View style={tailwind('py-5')}>
                <TouchableWithoutFeedback style={tailwind('m-5')} onPress={() => navigation.replace('SignIn')}>
                  <Text style={[]}> {strings.screens.SignInScreen.back}</Text>
                </TouchableWithoutFeedback>
              </View>
            </View>
          </View>
        </View>
      </AppScreen>
    );
  }
  return <></>;
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 10,
    height: normalize(55),
    justifyContent: 'center',
    marginTop: normalize(10),
    width: '45%',
  },
  buttonOn: {
    backgroundColor: '#4585f5',
    flex: 1,
  },
  buttonOnLabel: {
    color: '#fff',
    fontFamily: 'NeueEinstellung-Medium',
    fontSize: normalize(15),
    textAlignVertical: 'center',
    textAlign: 'center',
  },
  buttonWrapper: {
    flexDirection: 'row',
    marginTop: normalize(15),
  },
});

export default ForgotPasswordScreen;
