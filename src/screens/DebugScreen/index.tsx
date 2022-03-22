import React from 'react';

import strings from '../../../assets/lang/strings';
import { getColor, tailwind } from '../../helpers/designSystem';
import ScreenTitle from '../../components/ScreenTitle';
import AppScreen from '../../components/AppScreen';
import { useNavigation } from '@react-navigation/native';
import { NavigationStackProp } from 'react-navigation-stack';
import { FlatList, Text, View } from 'react-native';
import AppButton from '../../components/AppButton';
import toastService from '../../services/toast';
import { ToastType } from '../../types';
import InternetWidget from '../../components/InternetWidget';
import { ArrowCircleDown, ArrowCircleUp, CheckCircle, Warning, WarningOctagon } from 'phosphor-react-native';
import AppText from '../../components/AppText';

function DebugScreen(): JSX.Element {
  const navigation = useNavigation<NavigationStackProp>();
  const onBackButtonPressed = () => navigation.goBack();
  const notifications = [
    {
      type: ToastType.Info,
      icon: null,
    },
    {
      type: ToastType.Success,
      icon: <CheckCircle weight="fill" color={getColor('green-40')} style={tailwind('mr-2')} />,
    },
    {
      type: ToastType.Warning,
      icon: <Warning weight="fill" color={getColor('yellow-30')} style={tailwind('mr-2')} />,
    },
    {
      type: ToastType.Error,
      icon: <WarningOctagon weight="fill" color={getColor('red-50')} style={tailwind('mr-2')} />,
    },
    {
      type: ToastType.Upload,
      icon: <ArrowCircleUp weight="fill" color={getColor('blue-30')} style={tailwind('mr-2')} />,
    },
    {
      type: ToastType.Download,
      icon: <ArrowCircleDown weight="fill" color={getColor('blue-30')} style={tailwind('mr-2')} />,
    },
  ];
  const onNotificationButtonPressed = ({ type }: { type: ToastType; icon: JSX.Element | null }) =>
    toastService.show({ text1: strings.screens.DebugScreen.notifications.test.text1, type });

  return (
    <AppScreen safeAreaTop style={tailwind('h-full')} backgroundColor={getColor('neutral-20')}>
      <ScreenTitle
        textStyle={tailwind('text-2xl')}
        text={strings.screens.DebugScreen.title}
        centerText
        onBackButtonPressed={onBackButtonPressed}
      />

      <InternetWidget style={tailwind('mb-3')} />

      {/* NOTIFICATIONS */}
      <View style={tailwind('px-5')}>
        <Text style={tailwind('text-xl')}>{strings.screens.DebugScreen.notifications.title}</Text>
        <Text style={tailwind('text-neutral-200 text-base')}>{strings.screens.DebugScreen.notifications.advice}</Text>

        <View style={tailwind('h-5')}></View>

        <FlatList
          data={notifications}
          numColumns={2}
          renderItem={(info) => {
            return (
              <AppButton
                onPress={() => onNotificationButtonPressed(info.item)}
                title={
                  <View style={tailwind('flex-row')}>
                    {info.item.icon && info.item.icon}
                    <AppText style={tailwind('text-white')}>
                      {strings.screens.DebugScreen.notifications.type[info.item.type]}
                    </AppText>
                  </View>
                }
                type="accept"
                style={tailwind('mx-1 flex-1 my-1')}
              />
            );
          }}
        ></FlatList>
      </View>
    </AppScreen>
  );
}

export default DebugScreen;
