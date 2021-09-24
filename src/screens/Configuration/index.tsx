import React, { useState, useEffect } from 'react';
import { GestureResponderEvent, Linking, Text, TouchableHighlight, View } from 'react-native';
import { connect } from 'react-redux';
import AppMenu from '../../components/AppMenu';
import { Reducers } from '../../redux/reducers/reducers';
import * as Unicons from '@iconscout/react-native-unicons'
import { tailwind } from '../../helpers/designSystem';
import { userActions } from '../../redux/actions';
import strings from '../../../assets/lang/strings';
import { ScrollView } from 'react-native-gesture-handler';
import * as Updates from 'expo-updates'

interface ConfigurationItemsProps extends Reducers {
  title: string,
  onPress?: (event: GestureResponderEvent) => void
}

function ConfigurationItem(props: ConfigurationItemsProps) {
  return <TouchableHighlight onPress={(event) => {
    if (props.onPress) {
      props.onPress(event);
    }
  }}>
    <View style={[tailwind('bg-white flex-row p-4'), {
      height: 56,
      borderBottomWidth: 1,
      borderColor: '#DFE1E6'
    }]}>
      <View style={tailwind('flex-grow justify-center')}>
        <Text>{props.title}</Text>
      </View>
      <View style={tailwind('justify-center')}>
        <Unicons.UilAngleRightB color="#C1C7D0" />
      </View>
    </View>
  </TouchableHighlight>
}

function ConfigurationGap() {
  return <View style={{ height: 18 }} />
}

function Configuration(props: Reducers): JSX.Element {
  const [showUpdateLink, setShowUpdateLink] = useState(false);
  const [debugText, setDebugText] = useState('');

  useEffect(() => {

    if (props.authenticationState.user.email !== 'alberto.msn@gmail.com') {
      return;
    }

    setDebugText('Checking new updates...')
    Updates.checkForUpdateAsync().then((updateResult) => {
      if (updateResult.isAvailable) {
        setDebugText('New Update Available')
      } else {
        setDebugText('Current latest version')
      }
    }).catch ((err) => {
      setDebugText('ERROR')
    })

    return () => {
      // eslint-disable-next-line no-console
      console.log('UNMOUNT')
    }
  }, [])

  return <ScrollView>
    <AppMenu {...props} title={strings.generic.settings} hideSearch={true} hideOptions={true} hideBackPress={true} />

    <ConfigurationItem {...props} title="Storage"
      onPress={() => {
        props.navigation.push('Storage')
      }} />
    <ConfigurationItem {...props} title="Billing"
      onPress={() => {
        props.navigation.push('Billing')
      }} />

    <ConfigurationGap />

    {/* <ConfigurationItem title={strings.generic.security} /> */}
    <ConfigurationItem {...props} title={strings.screens.change_password.title}
      onPress={() => {
        props.navigation.push('RecoverPassword')
      }} />

    <ConfigurationGap />

    <ConfigurationItem {...props} title="Contact"
      onPress={() => {
        Linking.openURL('https://help.internxt.com')
      }} />
    <ConfigurationItem {...props} title="More info"
      onPress={() => {
        Linking.openURL('https://internxt.com')
      }} />
    <ConfigurationItem {...props} title="Log out"
      onPress={() => {
        props.dispatch(userActions.signout())
      }} />

    <ConfigurationGap />

    <Text>{debugText}</Text>

    <View style={tailwind('flex items-center text-base m-5')}>
      <Text style={tailwind('text-center text-base text-sm text-gray-50')}>
        Internxt Drive v1.4.2 (5)
      </Text>
    </View>
  </ScrollView>
}
const mapStateToProps = (state: any) => {
  return { ...state }
};

export default connect(mapStateToProps)(Configuration);
