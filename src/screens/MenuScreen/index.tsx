import React from 'react';
import { GestureResponderEvent, Linking, Text, TouchableHighlight, View, ScrollView } from 'react-native';
import * as Unicons from '@iconscout/react-native-unicons';
import { getColor, tailwind } from '../../helpers/designSystem';
import strings from '../../../assets/lang/strings';
import VersionUpdate from '../../components/VersionUpdate';
import ScreenTitle from '../../components/ScreenTitle';
import { AppScreen } from '../../types';
import { useNavigation } from '@react-navigation/native';
import { NavigationStackProp } from 'react-navigation-stack';
import { useAppDispatch } from '../../store/hooks';
import { authThunks } from '../../store/slices/auth';

interface MenuItemProps {
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

function MenuScreen(): JSX.Element {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NavigationStackProp>();

  return (
    <ScrollView contentContainerStyle={tailwind('app-screen h-full')}>
      <View style={tailwind('h-full')}>
        <ScreenTitle text={strings.generic.settings} centerText onBackButtonPressed={navigation.goBack} />

        <View style={tailwind('flex-grow')}>
          <MenuItem
            title={strings.components.app_menu.settings.storage}
            onPress={() => {
              navigation.push(AppScreen.Storage);
            }}
          />

          <MenuItem
            title={strings.screens.billing.title}
            onPress={() => {
              navigation.push(AppScreen.Billing);
            }}
          />

          <MenuSeparator />

          <MenuItem
            title={strings.screens.change_password.title}
            onPress={() => {
              navigation.push(AppScreen.RecoverPassword);
            }}
          />

          <MenuSeparator />

          <MenuItem
            title={strings.components.app_menu.settings.contact}
            onPress={() => {
              Linking.openURL('https://help.internxt.com');
            }}
          />
          <MenuItem
            title={strings.components.app_menu.settings.more}
            onPress={() => {
              Linking.openURL('https://internxt.com');
            }}
          />
          <MenuItem
            title={strings.components.app_menu.settings.signOut}
            onPress={() => {
              dispatch(authThunks.signOutThunk());
              navigation.replace(AppScreen.SignIn);
            }}
          />

          <MenuSeparator />
        </View>

        <View style={tailwind('flex text-base m-5')}>
          <VersionUpdate />
        </View>
      </View>
    </ScrollView>
  );
}

export default MenuScreen;
