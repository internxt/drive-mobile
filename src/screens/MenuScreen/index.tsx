import React from 'react';
import {
  GestureResponderEvent,
  Linking,
  Text,
  TouchableHighlight,
  View,
  ScrollView,
  StyleProp,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { CaretRight } from 'phosphor-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { getColor, tailwind } from '../../helpers/designSystem';
import strings from '../../../assets/lang/strings';
import AppVersionWidget from '../../components/AppVersionWidget';
import ScreenTitle from '../../components/AppScreenTitle';
import { AppScreenKey as AppScreenKey } from '../../types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { authSelectors } from '../../store/slices/auth';
import globalStyle from '../../styles';
import AppScreen from '../../components/AppScreen';
import appService from '../../services/app';
import AppText from '../../components/AppText';
import { uiActions } from '../../store/slices/ui';

interface MenuItemProps {
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  arrowColor?: string;
}

function MenuItem(props: MenuItemProps) {
  return (
    <TouchableHighlight
      underlayColor={getColor('neutral-30')}
      onPress={(event) => {
        if (props.onPress) {
          props.onPress(event);
        }
      }}
    >
      <View style={[tailwind('flex-row px-4 py-3'), props.style]}>
        <View style={tailwind('flex-grow justify-center')}>
          <Text style={[tailwind('text-lg text-neutral-500'), props.textStyle]}>{props.title}</Text>
        </View>
        <View style={tailwind('justify-center')}>
          <CaretRight color={props.arrowColor || getColor('neutral-60')} />
        </View>
      </View>
    </TouchableHighlight>
  );
}

function MenuSeparator() {
  return <View style={tailwind('h-6')} />;
}

function MenuScreen(): JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const userNameLetters = useAppSelector(authSelectors.nameLetters);
  const userFullName = useAppSelector(authSelectors.userFullName);
  const onLogoutPressed = () => {
    dispatch(uiActions.setIsSignOutModalOpen(true));
  };

  return (
    <AppScreen safeAreaTop backgroundColor={getColor('neutral-20')} style={tailwind('min-h-full')}>
      <ScrollView>
        <ScreenTitle
          text={strings.generic.settings}
          showBackButton={false}
          textStyle={tailwind('text-3xl font-semibold')}
        />
        <View style={tailwind('px-5 mt-2 flex-grow')}>
          <View style={tailwind('bg-white rounded-xl')}>
            <View style={tailwind('items-center flex-row p-4')}>
              <View style={tailwind('bg-blue-20 items-center justify-center rounded-3xl w-10 h-10')}>
                <AppText semibold style={tailwind('text-blue-80 font-bold text-xl')}>
                  {userNameLetters}
                </AppText>
              </View>

              <View style={tailwind('ml-3')}>
                <Text
                  style={{ ...tailwind('text-xl text-neutral-500 font-semibold'), ...globalStyle.fontWeight.semibold }}
                >
                  {userFullName}
                </Text>
                <Text style={tailwind('text-neutral-100')}>{user?.email}</Text>
              </View>
            </View>
            <MenuItem
              title={strings.components.app_menu.settings.signOut}
              onPress={onLogoutPressed}
              textStyle={tailwind('text-red-60')}
              arrowColor={getColor('red-60')}
              style={tailwind('border-t border-neutral-20')}
            />
          </View>

          <MenuSeparator />

          <View style={tailwind('bg-white rounded-xl')}>
            <MenuItem
              title={strings.components.app_menu.settings.storage}
              onPress={() => {
                navigation.push(AppScreenKey.Storage);
              }}
              style={tailwind('border-b border-neutral-20')}
            />

            {appService.constants.REACT_NATIVE_SHOW_BILLING && (
              <MenuItem
                title={strings.screens.billing.title}
                onPress={() => {
                  navigation.push(AppScreenKey.Billing);
                }}
              />
            )}
          </View>

          <MenuSeparator />

          <View style={tailwind('bg-white rounded-xl')}>
            <MenuItem
              title={strings.screens.change_password.title}
              onPress={() => {
                navigation.push(AppScreenKey.RecoverPassword);
              }}
            />
          </View>

          <MenuSeparator />

          <View style={tailwind('bg-white rounded-xl')}>
            <MenuItem
              title={strings.components.app_menu.settings.contact}
              onPress={() => {
                Linking.openURL('https://help.internxt.com');
              }}
              style={tailwind('border-b border-neutral-20')}
            />
            <MenuItem
              title={strings.components.app_menu.settings.more}
              onPress={() => {
                Linking.openURL('https://internxt.com');
              }}
              style={tailwind('border-b border-neutral-20')}
            />
          </View>

          <MenuSeparator />

          {appService.constants.REACT_NATIVE_DEBUG && (
            <View style={tailwind('bg-white rounded-xl')}>
              <MenuItem
                title={strings.screens.DebugScreen.title}
                onPress={() => {
                  navigation.push(AppScreenKey.Debug);
                }}
              />
            </View>
          )}
        </View>

        <View style={tailwind('flex text-base mt-9 mb-5')}>
          <AppVersionWidget />
        </View>
      </ScrollView>
    </AppScreen>
  );
}

export default MenuScreen;
