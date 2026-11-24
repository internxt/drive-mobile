import { ArrowCircleDown, ArrowCircleUp, CheckCircle, Warning, WarningOctagon } from 'phosphor-react-native';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import strings from '../../../assets/lang/strings';
import useGetColor from '../../hooks/useColor';
import notificationsService from '../../services/NotificationsService';
import { NotificationType } from '../../types';
import AppButton from '../AppButton';
import AppText from '../AppText';
import { cssInterop } from 'nativewind';

interface DebugNotificationsWidgetProps {
  style?: StyleProp<ViewStyle>;
  className?: string;
}

const DebugNotificationsWidget = (props: DebugNotificationsWidgetProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const notifications = [
    {
      type: NotificationType.Info,
      icon: null,
    },
    {
      type: NotificationType.Success,
      icon: <CheckCircle weight="fill" color={getColor('text-green')} style={tailwind('mr-2')} />,
    },
    {
      type: NotificationType.Warning,
      icon: <Warning weight="fill" color={getColor('text-yellow')} style={tailwind('mr-2')} />,
    },
    {
      type: NotificationType.Error,
      icon: <WarningOctagon weight="fill" color={getColor('text-red')} style={tailwind('mr-2')} />,
    },
    {
      type: NotificationType.Upload,
      icon: <ArrowCircleUp weight="fill" color={getColor('text-primary')} style={tailwind('mr-2')} />,
    },
    {
      type: NotificationType.Download,
      icon: <ArrowCircleDown weight="fill" color={getColor('text-primary')} style={tailwind('mr-2')} />,
    },
  ];
  const onNotificationButtonPressed = ({ type }: { type: NotificationType; icon: JSX.Element | null }) =>
    notificationsService.show({ text1: strings.screens.DebugScreen.notifications.test.text1, type });

  return (
    <View className="px-5" style={props.style}>
      <AppText className="text-xl">{strings.screens.DebugScreen.notifications.title}</AppText>
      <AppText className="text-gray-50 text-base">{strings.screens.DebugScreen.notifications.advice}</AppText>

      <View className="h-3"></View>
      <View className="flex flex-row flex-wrap">
        {notifications.map((info, index) => {
          return (
            <View className="w-1/2" key={index}>
              <AppButton
                onPress={() => onNotificationButtonPressed(info)}
                title={
                  <View className="flex-row">
                    {info.icon && info.icon}
                    <AppText className="text-white">
                      {strings.screens.DebugScreen.notifications.type[info.type]}
                    </AppText>
                  </View>
                }
                type="accept"
                className="mx-1 flex-1 my-1"
              />
            </View>
          );
        })}
      </View>
    </View>
  );
};

cssInterop(DebugNotificationsWidget, { className: 'style' });

export default DebugNotificationsWidget;
