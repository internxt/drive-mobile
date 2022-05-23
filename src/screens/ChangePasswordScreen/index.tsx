import React, { useState } from 'react';
import { View, Text, TextInput, TouchableHighlight, TouchableWithoutFeedback } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import validationService from '../../services/ValidationService';
import strings from '../../../assets/lang/strings';
import { tailwind } from '../../helpers/designSystem';
import { doChangePassword } from './changePasswordUtils';
import ScreenTitle from '../../components/AppScreenTitle';
import { AppScreenKey, NotificationType } from '../../types';
import AppScreen from '../../components/AppScreen';
import notificationsService from '../../services/NotificationsService';
import { Eye } from 'phosphor-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

function ChangePasswordScreen(): JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleOnPress = () => {
    setIsLoading(true);
    doChangePassword({ password, newPassword })
      .then(() => {
        notificationsService.show({ text1: strings.messages.passwordChanged, type: NotificationType.Success });
        setPassword('');
        setNewPassword('');
        setConfirmPassword('');
      })
      .catch((err: Error) => {
        notificationsService.show({ type: NotificationType.Error, text1: err.message });
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
    <AppScreen safeAreaTop style={tailwind('flex-1 bg-neutral-20')}>
      <ScreenTitle
        text={strings.components.inputs.password}
        centerText
        onBackButtonPressed={() => navigation.goBack()}
      />
      <View style={tailwind('px-8')}>
        <View style={tailwind('items-center p-1')}>
          <Text style={tailwind('text-base text-neutral-900')}>{strings.screens.change_password.title}</Text>
        </View>
        <View style={tailwind('items-center p-1')}>
          <Text style={tailwind('text-center text-neutral-700')}>{strings.screens.change_password.warning}</Text>
        </View>
        <TouchableWithoutFeedback
          onPress={() => {
            navigation.push(AppScreenKey.RecoverPassword);
          }}
        >
          <Text style={tailwind('text-base text-sm text-blue-70 text-center m-3')}>
            {strings.screens.change_password.iDontRememberMyPassword}
          </Text>
        </TouchableWithoutFeedback>
        <View style={tailwind('p-2')}>
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
            <Eye
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
            <Eye
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
            <Eye
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
    </AppScreen>
  );
}

export default ChangePasswordScreen;
