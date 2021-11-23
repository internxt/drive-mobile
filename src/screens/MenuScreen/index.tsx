import React from 'react';
import { GestureResponderEvent, Linking, Text, TouchableHighlight, View, ScrollView } from 'react-native';
import { connect } from 'react-redux';
import { Reducers } from '../../store/reducers/reducers';
import * as Unicons from '@iconscout/react-native-unicons';
import { getColor, tailwind } from '../../helpers/designSystem';
import { userActions } from '../../store/actions';
import strings from '../../../assets/lang/strings';
import VersionUpdate from '../../components/VersionUpdate';
import ScreenTitle from '../../components/ScreenTitle';
import { AppScreen } from '../../types';

interface MenuItemProps extends Reducers {
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
}

function MenuItem(props: MenuItemProps) {
  return (
    <TouchableHighlight
      onPress={(event) => {
        if (props.onPress) {
          props.onPress(event);
        }
      }}
    >
      <View style={tailwind('bg-white flex-row p-4 border-b border-neutral-40')}>
        <View style={tailwind('flex-grow justify-center')}>
          <Text>{props.title}</Text>
        </View>
        <View style={tailwind('justify-center')}>
          <Unicons.UilAngleRightB color={getColor('neutral-60')} />
        </View>
      </View>
    </TouchableHighlight>
  );
}

function MenuSeparator() {
  return <View style={tailwind('h-5')} />;
}

function MenuScreen(props: Reducers): JSX.Element {
  return (
    <ScrollView contentContainerStyle={tailwind('app-screen h-full')}>
      <View style={tailwind('h-full')}>
        <ScreenTitle text={strings.generic.settings} centerText onBackButtonPressed={props.navigation.goBack} />

        <View style={tailwind('flex-grow')}>
          <MenuItem
            {...props}
            title={strings.components.app_menu.settings.storage}
            onPress={() => {
              props.navigation.push(AppScreen.Storage);
            }}
          />
          <MenuItem
            {...props}
            title={strings.screens.billing.title}
            onPress={() => {
              props.navigation.push(AppScreen.Billing);
            }}
          />

          <MenuSeparator />

          <MenuItem
            {...props}
            title={strings.screens.change_password.title}
            onPress={() => {
              props.navigation.push(AppScreen.RecoverPassword);
            }}
          />

          <MenuSeparator />

          <MenuItem
            {...props}
            title={strings.components.app_menu.settings.contact}
            onPress={() => {
              Linking.openURL('https://help.internxt.com');
            }}
          />
          <MenuItem
            {...props}
            title={strings.components.app_menu.settings.more}
            onPress={() => {
              Linking.openURL('https://internxt.com');
            }}
          />
          <MenuItem
            {...props}
            title={strings.components.app_menu.settings.signOut}
            onPress={() => {
              props.dispatch(userActions.signout());
            }}
          />

          <MenuSeparator />
        </View>

        <View style={tailwind('flex text-base m-5')}>
          <VersionUpdate {...props} />
        </View>
      </View>
    </ScrollView>
  );
}
const mapStateToProps = (state) => {
  return { ...state };
};

export default connect(mapStateToProps)(MenuScreen);
