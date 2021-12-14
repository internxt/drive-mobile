import React from 'react';
import { GestureResponderEvent, Linking, Text, TouchableHighlight, View, ScrollView } from 'react-native';
import { connect } from 'react-redux';
import AppMenu from '../../components/AppMenu';
import { Reducers } from '../../store/reducers/reducers';
import * as Unicons from '@iconscout/react-native-unicons'
import { getColor, tailwind } from '../../helpers/designSystem';
import { userActions } from '../../store/actions';
import strings from '../../../assets/lang/strings';
import VersionUpdate from '../../components/VersionUpdate';

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
    <View style={tailwind('bg-white flex-row p-4 border-b border-neutral-40')}>
      <View style={tailwind('flex-grow justify-center')}>
        <Text>{props.title}</Text>
      </View>
      <View style={tailwind('justify-center')}>
        <Unicons.UilAngleRightB color={getColor('neutral-60')} />
      </View>
    </View>
  </TouchableHighlight>
}

function ConfigurationGap() {
  return <View style={tailwind('h-5')} />
}

function Configuration(props: Reducers): JSX.Element {
  return <ScrollView contentContainerStyle={tailwind('h-full')}>
    <View style={tailwind('h-full')}>
      <AppMenu {...props}
        title={strings.generic.settings}
        hideSearch={true}
        hideOptions={true}
        hideNavigation={true}
        hideSortBar={true}
        centerTitle={true}
        hideBackPress={true} />

      <View style={tailwind('flex-grow')}>
        <ConfigurationItem {...props} title="Storage"
          onPress={() => {
            props.navigation.push('Storage')
          }} />
        {/* <ConfigurationItem {...props} title="Billing"
          onPress={() => {
            props.navigation.push('Billing')
          }} /> */}

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

        {
          false
          &&
          <ConfigurationItem {...props} title="Dev tools"
            onPress={() => {
              props.navigation.push('DebugView');
            }}
          />
        }
      </View>

      <View style={tailwind('flex text-base m-5')}>
        <VersionUpdate {...props} />
      </View>
    </View>
  </ScrollView>
}
const mapStateToProps = (state: any) => {
  return { ...state }
};

export default connect(mapStateToProps)(Configuration);
