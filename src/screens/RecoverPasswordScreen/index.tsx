import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableHighlight, TouchableWithoutFeedback } from 'react-native';
import * as Unicons from '@iconscout/react-native-unicons';

import strings from '../../../assets/lang/strings';
import { getColor, tailwind } from '../../helpers/designSystem';
import { notify } from '../../services/toast';
import authService from '../../services/auth';
import validationService from '../../services/validation';
import ScreenTitle from '../../components/ScreenTitle';
import { useNavigation } from '@react-navigation/native';
import { NavigationStackProp } from 'react-navigation-stack';

function ChangePassword(): JSX.Element {
  const navigation = useNavigation<NavigationStackProp>();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleOnPress = () => {
    setIsLoading(true);
    authService
      .doRecoverPassword(newPassword)
      .then(() => {
        notify({ text: 'Password changed', type: 'success' });
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

  const isValidNewPassword = validationService.isStrongPassword(newPassword);
  const passwordConfirmed = confirmPassword && newPassword === confirmPassword;

  const activeButton = isValidNewPassword && passwordConfirmed;
  const [newPasswordFocus, setNewPasswordFocus] = useState(false);
  const [confirmPasswordFocus, setConfirmPasswordFocus] = useState(false);

  const isEmptyPassword = !newPassword;
  const isEmptyConfirmPassword = !confirmPassword;

  return (
    <View style={tailwind('app-screen bg-neutral-20 h-full')}>
      <ScreenTitle
        textStyle={tailwind('text-2xl')}
        text={strings.components.inputs.password}
        centerText
        onBackButtonPressed={() => navigation.goBack()}
      />
      <View style={tailwind('mx-3')}>
        <View style={tailwind('items-center my-3')}>
          <Text style={styles.titleText}>{strings.screens.recover_password.title}</Text>
        </View>
        <View style={tailwind('')}>
          <Text style={styles.subtitleText}>{strings.screens.recover_password.warning}</Text>
        </View>
        <View style={tailwind('m-3')}>
          <View
            style={[
              tailwind('input-wrapper my-2 items-stretch'),
              tailwind(newPassword === '' ? '' : isValidNewPassword ? 'input-valid' : 'input-error'),
            ]}
          >
            <TextInput
              style={tailwind('input pl-4')}
              value={newPassword}
              onChangeText={(value) => setNewPassword(value)}
              placeholder={strings.components.inputs.newPassword}
              placeholderTextColor="#666"
              secureTextEntry={!showPassword}
              textContentType="password"
              onFocus={() => setNewPasswordFocus(true)}
              onBlur={() => setNewPasswordFocus(false)}
            />

            {(!isEmptyPassword || newPasswordFocus) && (
              <TouchableWithoutFeedback onPress={() => setShowPassword(!showPassword)}>
                <View style={tailwind('justify-center p-3')}>
                  {showPassword ? (
                    <Unicons.UilEyeSlash color={getColor('neutral-80')} />
                  ) : (
                    <Unicons.UilEye color={getColor('neutral-80')} />
                  )}
                </View>
              </TouchableWithoutFeedback>
            )}
          </View>
          <View
            style={[
              tailwind('input-wrapper my-2 items-stretch'),
              tailwind(confirmPassword === '' ? '' : passwordConfirmed ? 'input-valid' : 'input-error'),
            ]}
          >
            <TextInput
              style={tailwind('input pl-4')}
              value={confirmPassword}
              onChangeText={(value) => setConfirmPassword(value)}
              placeholder={strings.components.inputs.confirm_password}
              placeholderTextColor="#666"
              secureTextEntry={!showConfirmPassword}
              textContentType="password"
              onFocus={() => setConfirmPasswordFocus(true)}
              onBlur={() => setConfirmPasswordFocus(false)}
            />

            {(!isEmptyConfirmPassword || confirmPasswordFocus) && (
              <TouchableWithoutFeedback onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <View style={tailwind('justify-center p-3')}>
                  {showConfirmPassword ? (
                    <Unicons.UilEyeSlash color={getColor('neutral-80')} />
                  ) : (
                    <Unicons.UilEye color={getColor('neutral-80')} />
                  )}
                </View>
              </TouchableWithoutFeedback>
            )}
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

const styles = StyleSheet.create({
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
});

export default ChangePassword;
