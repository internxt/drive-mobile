import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableHighlight, TouchableWithoutFeedback } from 'react-native';

import strings from '../../../assets/lang/strings';
import authService from '../../services/AuthService';
import validationService from '../../services/ValidationService';
import ScreenTitle from '../../components/AppScreenTitle';
import AppTextInput from '../../components/AppTextInput';
import AppScreen from '../../components/AppScreen';
import notificationsService from '../../services/NotificationsService';
import { NotificationType } from '../../types';
import { Eye, EyeSlash } from 'phosphor-react-native';
import { RootStackScreenProps } from '../../types/navigation';
import { useTailwind } from 'tailwind-rn';
import AppText from '../../components/AppText';

function ChangePasswordScreen({ navigation }: RootStackScreenProps<'ChangePassword'>): JSX.Element {
  const tailwind = useTailwind();
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
        notificationsService.show({ text1: strings.messages.passwordChanged, type: NotificationType.Success });
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

  const isValidNewPassword = validationService.isStrongPassword(newPassword);
  const passwordConfirmed = confirmPassword && newPassword === confirmPassword;

  const activeButton = isValidNewPassword && passwordConfirmed;
  const [newPasswordFocus, setNewPasswordFocus] = useState(false);
  const [confirmPasswordFocus, setConfirmPasswordFocus] = useState(false);

  const isEmptyPassword = !newPassword;
  const isEmptyConfirmPassword = !confirmPassword;

  return (
    <AppScreen safeAreaTop backgroundColor={tailwind('text-neutral-20').color as string} style={tailwind('h-full')}>
      <ScreenTitle
        textStyle={tailwind('text-2xl')}
        text={strings.components.inputs.password}
        centerText
        onBackButtonPressed={() => navigation.goBack()}
      />
      <View style={tailwind('mx-5')}>
        <View style={tailwind('items-center my-3')}>
          <Text style={{ ...styles.titleText, ...tailwind('text-base') }}>
            {strings.screens.recover_password.title}
          </Text>
        </View>
        <View>
          <Text style={{ ...styles.subtitleText, ...tailwind('text-center') }}>
            {strings.screens.recover_password.warning}
          </Text>
        </View>
        <View style={tailwind('my-3')}>
          <View
            style={[
              tailwind('input-wrapper my-2 items-stretch'),
              tailwind(newPassword === '' ? '' : isValidNewPassword ? 'input-valid' : 'input-error'),
            ]}
          >
            <AppTextInput
              containerStyle={tailwind('bg-white w-full')}
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
                <View style={tailwind('relative right-14 justify-center p-3')}>
                  {showPassword ? (
                    <EyeSlash color={tailwind('text-neutral-80').color as string} />
                  ) : (
                    <Eye color={tailwind('text-neutral-80').color as string} />
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
            <AppTextInput
              containerStyle={tailwind('bg-white w-full')}
              style={tailwind('input pl-4')}
              value={confirmPassword}
              onChangeText={(value) => setConfirmPassword(value)}
              placeholder={strings.components.inputs.confirm_password}
              placeholderTextColor={tailwind('text-neutral-100').color as string}
              secureTextEntry={!showConfirmPassword}
              textContentType="password"
              onFocus={() => setConfirmPasswordFocus(true)}
              onBlur={() => setConfirmPasswordFocus(false)}
            />

            {(!isEmptyConfirmPassword || confirmPasswordFocus) && (
              <TouchableWithoutFeedback onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <View style={tailwind('relative right-14 justify-center p-3')}>
                  {showConfirmPassword ? (
                    <EyeSlash color={tailwind('text-neutral-80').color as string} />
                  ) : (
                    <Eye color={tailwind('text-neutral-80').color as string} />
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
            <AppText style={tailwind('text-white')}>{strings.screens.change_password.title}</AppText>
          </TouchableHighlight>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  titleText: {
    color: '#091E42',
    fontWeight: 'bold',
  },
  subtitleText: {
    color: '#253858',
  },
});

export default ChangePasswordScreen;
