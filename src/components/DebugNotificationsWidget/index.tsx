import { ArrowCircleDown, ArrowCircleUp, CheckCircle, Warning, WarningOctagon } from 'phosphor-react-native';
import { FlatList, StyleProp, View, ViewStyle } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import strings from '../../../assets/lang/strings';
import notificationsService from '../../services/NotificationsService';
import { NotificationType } from '../../types';
import AppButton from '../AppButton';
import AppText from '../AppText';

interface DebugNotificationsWidgetProps {
  style?: StyleProp<ViewStyle>;
}

const DebugNotificationsWidget = (props: DebugNotificationsWidgetProps): JSX.Element => {
  const tailwind = useTailwind();
  const notifications = [
    {
      type: NotificationType.Info,
      icon: null,
    },
    {
      type: NotificationType.Success,
      icon: <CheckCircle weight="fill" color={tailwind('text-green-40').color as string} style={tailwind('mr-2')} />,
    },
    {
      type: NotificationType.Warning,
      icon: <Warning weight="fill" color={tailwind('text-yellow-30').color as string} style={tailwind('mr-2')} />,
    },
    {
      type: NotificationType.Error,
      icon: <WarningOctagon weight="fill" color={tailwind('text-red-50').color as string} style={tailwind('mr-2')} />,
    },
    {
      type: NotificationType.Upload,
      icon: <ArrowCircleUp weight="fill" color={tailwind('text-blue-30').color as string} style={tailwind('mr-2')} />,
    },
    {
      type: NotificationType.Download,
      icon: <ArrowCircleDown weight="fill" color={tailwind('text-blue-30').color as string} style={tailwind('mr-2')} />,
    },
  ];
  const onNotificationButtonPressed = ({ type }: { type: NotificationType; icon: JSX.Element | null }) =>
    notificationsService.show({ text1: strings.screens.DebugScreen.notifications.test.text1, type });

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
