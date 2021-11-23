import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableHighlight, TouchableWithoutFeedback } from 'react-native';
import { connect } from 'react-redux';

import validationService from '../../services/validation';
import strings from '../../../assets/lang/strings';
import { tailwind } from '../../helpers/designSystem';
import * as Unicons from '@iconscout/react-native-unicons';
import { doChangePassword } from './changePasswordUtils';
import { notify } from '../../helpers';
import { Reducers } from '../../store/reducers/reducers';
import ScreenTitle from '../../components/ScreenTitle';
import { AppScreen } from '../../types';

function ChangePasswordScreen(props: Reducers) {
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleOnPress = () => {
    setIsLoading(true);
    doChangePassword({ password, newPassword })
      .then(() => {
        notify({ text: 'Password changed', type: 'success' });
        setPassword('');
        setNewPassword('');
        setConfirmPassword('');
      })
      .catch((err: Error) => {
        notify({ type: 'error', text: err.message });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const isValidPassword = !validationService.isNullOrEmpty(password);
  const isValidNewPassword = validationService.isStrongPassword(newPassword);
  const passwordConfirmed = confirmPassword && newPassword === confirmPassword;

  const activeButton = isValidPassword && isValidNewPassword && passwordConfirmed;
  const [passwordFocus, setPasswordFocus] = useState(false);
  const [newPasswordFocus, setNewPasswordFocus] = useState(false);
  const [confirmPasswordFocus, setConfirmPasswordFocus] = useState(false);

  return (
    <View style={tailwind('app-screen flex-1 bg-white')}>
      <ScreenTitle
        text={strings.components.inputs.password}
        centerText
        onBackButtonPressed={() => props.navigation.goBack()}
      />
      <View style={styles.mainContainer}>
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>{strings.screens.change_password.title}</Text>
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.subtitleText}>{strings.screens.change_password.warning}</Text>
        </View>
        <TouchableWithoutFeedback
          onPress={() => {
            props.navigation.push(AppScreen.RecoverPassword);
          }}
        >
          <Text style={tailwind('text-base text-sm text-blue-70 text-center m-3')}>
            {"I don't remember my password"}
          </Text>
        </TouchableWithoutFeedback>
        <View style={styles.container}>
          <View
            style={[
              tailwind('input-wrapper my-2'),
              tailwind(password === '' ? '' : isValidPassword ? 'input-valid' : 'input-error'),
            ]}
          >
            <TextInput
              style={tailwind('input')}
              value={password}
              onChangeText={(value) => setPassword(value)}
              placeholder={strings.components.inputs.password}
              placeholderTextColor="#666"
              secureTextEntry={true}
              textContentType="password"
              onFocus={() => setPasswordFocus(true)}
              onBlur={() => setPasswordFocus(false)}
            />
            <Unicons.UilEye
              style={tailwind('input-icon hidden')}
              color={passwordFocus && isValidPassword ? '#42BE65' : '#7A869A'}
            />
          </View>
          <View
            style={[
              tailwind('input-wrapper my-2'),
              tailwind(newPassword === '' ? '' : isValidNewPassword ? 'input-valid' : 'input-error'),
            ]}
          >
            <TextInput
              style={tailwind('input')}
              value={newPassword}
              onChangeText={(value) => setNewPassword(value)}
              placeholder={strings.components.inputs.newPassword}
              placeholderTextColor="#666"
              secureTextEntry={true}
              textContentType="password"
              onFocus={() => setNewPasswordFocus(true)}
              onBlur={() => setNewPasswordFocus(false)}
            />
            <Unicons.UilEye
              style={tailwind('input-icon hidden')}
              color={newPasswordFocus && isValidNewPassword ? '#42BE65' : '#7A869A'}
            />
          </View>
          <View
            style={[
              tailwind('input-wrapper my-2'),
              tailwind(confirmPassword === '' ? '' : passwordConfirmed ? 'input-valid' : 'input-error'),
            ]}
          >
            <TextInput
              style={tailwind('input')}
              value={confirmPassword}
              onChangeText={(value) => setConfirmPassword(value)}
              placeholder={strings.components.inputs.confirm_password}
              placeholderTextColor="#666"
              secureTextEntry={true}
              textContentType="password"
              onFocus={() => setConfirmPasswordFocus(true)}
              onBlur={() => setConfirmPasswordFocus(false)}
            />
            <Unicons.UilEye
              style={tailwind('input-icon hidden')}
              color={confirmPasswordFocus && passwordConfirmed ? '#42BE65' : '#7A869A'}
            />
          </View>
          <TouchableHighlight
            style={[tailwind('btn btn-primary my-5'), !(activeButton && !isLoading) && tailwind('opacity-50')]}
            underlayColor="#4585f5"
            onPress={handleOnPress}
            disabled={!activeButton || isLoading}
          >
            <Text style={tailwind('text-base btn-label')}>{strings.screens.change_password.title}</Text>
          </TouchableHighlight>
        </View>
      </View>
    </View>
  );
}

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(ChangePasswordScreen);

const styles = StyleSheet.create({
  titleContainer: {
    alignItems: 'center',
    padding: 4,
  },
  titleText: {
    color: '#091E42',
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: 'NeueEinstellung-Regular',
  },
  subtitleText: {
    textAlign: 'center',
    color: '#253858',
    fontFamily: 'NeueEinstellung-Regular',
  },
  mainContainer: {
    paddingHorizontal: 30,
  },
  container: {
    padding: 8,
  },
});
