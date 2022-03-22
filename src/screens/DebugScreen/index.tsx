import React from 'react';

import strings from '../../../assets/lang/strings';
import { getColor, tailwind } from '../../helpers/designSystem';
import ScreenTitle from '../../components/ScreenTitle';
import AppScreen from '../../components/AppScreen';
import { useNavigation } from '@react-navigation/native';
import { NavigationStackProp } from 'react-navigation-stack';
import { Text, View } from 'react-native';
import AppButton from '../../components/AppButton';
import toastService from '../../services/toast';
import { ToastType } from '../../types';

function DebugScreen(): JSX.Element {
  const navigation = useNavigation<NavigationStackProp>();
  const onBackButtonPressed = () => navigation.goBack();
  const onNotificationSuccessButtonPressed = () =>
    toastService.show({ text1: strings.screens.DebugScreen.notifications.test.text1, type: ToastType.Success });
  const onNotificationWarningButtonPressed = () =>
    toastService.show({ text1: strings.screens.DebugScreen.notifications.test.text1, type: ToastType.Warning });
  const onNotificationErrorButtonPressed = () =>
    toastService.show({ text1: strings.screens.DebugScreen.notifications.test.text1, type: ToastType.Error });
  const onNotificationUploadButtonPressed = () =>
    toastService.show({ text1: strings.screens.DebugScreen.notifications.test.text1, type: ToastType.Upload });
  const onNotificationDownloadButtonPressed = () =>
    toastService.show({
      text1: strings.screens.DebugScreen.notifications.test.text1,
      type: ToastType.Download,
    });

  return (
    <AppScreen safeAreaTop style={tailwind('h-full')} backgroundColor={getColor('neutral-20')}>
      <ScreenTitle
        textStyle={tailwind('text-2xl')}
        text={strings.screens.DebugScreen.title}
        centerText
        onBackButtonPressed={onBackButtonPressed}
      />

      {/* NOTIFICATIONS */}
      <View style={tailwind('px-5')}>
        <Text style={tailwind('text-xl')}>{strings.screens.DebugScreen.notifications.title}</Text>
        <Text style={tailwind('text-neutral-200 text-base')}>{strings.screens.DebugScreen.notifications.advice}</Text>

        <View style={tailwind('h-5')}></View>

        <AppButton
          onPress={onNotificationSuccessButtonPressed}
          title={strings.screens.DebugScreen.notifications.type.success}
          type="accept"
          style={tailwind('my-1')}
        />
        <AppButton
          onPress={onNotificationWarningButtonPressed}
          title={strings.screens.DebugScreen.notifications.type.warning}
          type="accept"
          style={tailwind('my-1')}
        />
        <AppButton
          onPress={onNotificationErrorButtonPressed}
          title={strings.screens.DebugScreen.notifications.type.error}
          type="accept"
          style={tailwind('my-1')}
        />
        <AppButton
          onPress={onNotificationUploadButtonPressed}
          title={strings.screens.DebugScreen.notifications.type.upload}
          type="accept"
          style={tailwind('my-1')}
        />
        <AppButton
          onPress={onNotificationDownloadButtonPressed}
          title={strings.screens.DebugScreen.notifications.type.download}
          type="accept"
          style={tailwind('my-1')}
        />
      </View>
    </AppScreen>
  );
}

export default DebugScreen;
