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

function ChangePassword(props: any) {
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

  return <View style={{ backgroundColor: 'white', flex: 1 }}>
    <AppMenu
      title={'Password'}
      onBackPress={() => props.navigation.goBack()}
      hideSearch={true} hideOptions={true} />
    <View style={styles.mainContainer}>
      <View style={styles.titleContainer}>
        <Text style={styles.titleText}>{'Recover password'}</Text>
      </View>
      <View style={styles.titleContainer}>
        <Text style={styles.subtitleText}>You can use this device to set a new password and recover your account as long as you keep this session alive.</Text>
        <Text style={styles.subtitleText}>Your personal PGP Keys will be invalidated and your master key will be re-encrypted.</Text>
      </View>
      <View style={styles.container}>
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
            style={[tailwind('input-icon'), { display: 'none' }]}
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
            style={[tailwind('input-icon'), { display: 'none' }]}
            color={confirmPasswordFocus && passwordConfirmed ? '#42BE65' : '#7A869A'} />
        </View>
        <TouchableHighlight
          style={[tailwind('btn btn-primary my-5'), (activeButton && !isLoading) ? null : { backgroundColor: '#A6C8FF' }]}
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
  titleContainer: {
    alignItems: 'center',
    padding: 6
  },
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
  },
  mainContainer: {
    paddingHorizontal: 30
  },
  container: {
    padding: 8
  }
});