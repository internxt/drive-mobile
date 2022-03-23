import { ArrowCircleDown, ArrowCircleUp, CheckCircle, Warning, WarningOctagon } from 'phosphor-react-native';
import { FlatList, StyleProp, View, ViewStyle } from 'react-native';

import strings from '../../../assets/lang/strings';
import { getColor, tailwind } from '../../helpers/designSystem';
import toastService from '../../services/toast';
import { ToastType } from '../../types';
import AppButton from '../AppButton';
import AppText from '../AppText';

interface DebugNotificationsWidgetProps {
  style?: StyleProp<ViewStyle>;
}

const DebugNotificationsWidget = (props: DebugNotificationsWidgetProps): JSX.Element => {
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
    <View style={[tailwind('px-5'), props.style]}>
      <AppText style={tailwind('text-xl')}>{strings.screens.DebugScreen.notifications.title}</AppText>
      <AppText style={tailwind('text-neutral-200 text-base')}>
        {strings.screens.DebugScreen.notifications.advice}
      </AppText>

      <View style={tailwind('h-3')}></View>

      <FlatList
        data={notifications}
        numColumns={2}
        keyExtractor={({ type }) => type}
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
  );
};

export default DebugNotificationsWidget;
