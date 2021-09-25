import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableHighlight } from 'react-native';
import { isStrongPassword } from '../Register/registerUtils';
import { connect } from 'react-redux';
import AppMenu from '../../components/AppMenu';
import strings from '../../../assets/lang/strings';
import { tailwind } from '../../helpers/designSystem';
import * as Unicons from '@iconscout/react-native-unicons';
import { notify } from '../../helpers'
import { doRecoverPassword } from './recover.service';
import { Reducers } from '../../redux/reducers/reducers';

function ChangePassword(props: Reducers) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleOnPress = () => {
    setIsLoading(true)
    doRecoverPassword(newPassword).then(() => {
      notify({ text: 'Password changed', type: 'success' });
      setNewPassword('');
      setConfirmPassword('');
    }).catch((err: Error) => {
      notify({ type: 'error', text: err.message });
    }).finally(() => {
      setIsLoading(false)
    })
  }

  const isValidNewPassword = isStrongPassword(newPassword);
  const passwordConfirmed = confirmPassword && newPassword === confirmPassword;

  const activeButton = isValidNewPassword && passwordConfirmed
  const [newPasswordFocus, setNewPasswordFocus] = useState(false);
  const [confirmPasswordFocus, setConfirmPasswordFocus] = useState(false);

  return <View style={tailwind('bg-white h-full')}>
    <AppMenu
      title={'Password'}
      onBackPress={() => props.navigation.goBack()}
      hideSearch={true} hideOptions={true} />
    <View style={tailwind('mx-3')}>
      <View style={tailwind('items-center m-3')}>
        <Text style={styles.titleText}>{strings.screens.recover_password.title}</Text>
      </View>
      <View style={tailwind('')}>
        <Text style={styles.subtitleText}>{strings.screens.recover_password.warning}</Text>
      </View>
      <View style={tailwind('m-3')}>
        <View style={[tailwind('input-wrapper my-2'), tailwind(newPassword === '' ? '' : (isValidNewPassword ? 'input-valid' : 'input-error'))]}>
          <TextInput
            style={tailwind('input')}
            value={newPassword}
            onChangeText={value => setNewPassword(value)}
            placeholder='New password'
            placeholderTextColor="#666"
            secureTextEntry={true}
            textContentType="password"
            onFocus={() => setNewPasswordFocus(true)}
            onBlur={() => setNewPasswordFocus(false)}
          />
          <Unicons.UilEye
            style={tailwind('input-icon hidden')}
            color={newPasswordFocus && isValidNewPassword ? '#42BE65' : '#7A869A'} />
        </View>
        <View style={[tailwind('input-wrapper my-2'), tailwind(confirmPassword === '' ? '' : (passwordConfirmed ? 'input-valid' : 'input-error'))]}>
          <TextInput
            style={tailwind('input')}
            value={confirmPassword}
            onChangeText={value => setConfirmPassword(value)}
            placeholder={strings.components.inputs.confirm_password}
            placeholderTextColor="#666"
            secureTextEntry={true}
            textContentType="password"
            onFocus={() => setConfirmPasswordFocus(true)}
            onBlur={() => setConfirmPasswordFocus(false)}
          />
          <Unicons.UilEye
            style={tailwind('input-icon hidden')}
            color={confirmPasswordFocus && passwordConfirmed ? '#42BE65' : '#7A869A'} />
        </View>
        <TouchableHighlight
          style={[tailwind('btn btn-primary my-5'), !(activeButton && !isLoading) && tailwind('opacity-50')]}
          underlayColor="#4585f5"
          onPress={handleOnPress}
          disabled={!activeButton || isLoading}>
          <Text style={tailwind('text-base btn-label')}>{strings.screens.change_password.title}</Text>
        </TouchableHighlight>
      </View>
    </View>
  </View>

}

const mapStateToProps = (state: any) => {
  return { ...state }
};

export default connect(mapStateToProps)(ChangePassword);

const styles = StyleSheet.create({
  titleText: {
    color: '#091E42',
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: 'NeueEinstellung-Regular'
  },
  subtitleText: {
    textAlign: 'center',
    color: '#253858',
    fontFamily: 'NeueEinstellung-Regular'
  }
});