import { ReactNode } from 'react';
import Toast, { BaseToast, BaseToastProps, ToastConfigParams } from 'react-native-toast-message';
import { ArrowCircleDown, ArrowCircleUp, CheckCircle, Warning, WarningOctagon } from 'phosphor-react-native';

import { AppToastExtraProps, NotificationType } from '../../types';
import { Dimensions, Text, TouchableHighlight, View } from 'react-native';
import strings from '../../../assets/lang/strings';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../hooks/useColor';
import Portal from '@burstware/react-native-portal';

const AppToast = (): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const safeAreaInsets = useSafeAreaInsets();
  const screenDimensions = Dimensions.get('screen');
  const defaultProps: BaseToastProps = {
    text1NumberOfLines: 1,
    style: {
      ...tailwind('rounded-xl border-0 border-neutral-20 border pl-3.5 h-12'),
      width: screenDimensions.width - 24,
      marginBottom: safeAreaInsets.bottom,
    },
    contentContainerStyle: tailwind('p-0'),
    text1Style: tailwind('text-base text-neutral-700 font-normal m-0 pr-3.5'),
    text2Style: tailwind('text-xs text-neutral-100'),
  };
  const iconDefaultProps = {
    size: 20,
  };
  const renderIcon = (icon: ReactNode) => <View style={tailwind('justify-center mr-2.5')}>{icon}</View>;
  const renderAction = (toastProps: ToastConfigParams<AppToastExtraProps>) => {
    const callback = () => {
      if (toastProps.props.action) {
        toastProps.props.action.onActionPress();
      }
      toastProps.hide();
    };

    const text = toastProps.props.action ? toastProps.props.action.text : strings.buttons.dismiss;
    return (
      <TouchableHighlight
        onPress={callback}
        underlayColor={getColor('text-neutral-30')}
        style={tailwind('rounded-r-xl ')}
      >
        <View style={tailwind('justify-center flex-1 px-3.5')}>
          <Text style={tailwind('text-blue-60 text-base')}>{text}</Text>
        </View>
      </TouchableHighlight>
    );
  };

  const config: {
    [key in NotificationType]: (props: ToastConfigParams<AppToastExtraProps>) => ReactNode;
  } = {
    [NotificationType.Info]: (props) => (
      <BaseToast {...defaultProps} {...props} renderTrailingIcon={() => renderAction(props)} />
    ),
    [NotificationType.Success]: (props) => (
      <BaseToast
        {...defaultProps}
        {...props}
        renderLeadingIcon={() =>
          renderIcon(<CheckCircle {...iconDefaultProps} weight="fill" color={getColor('text-green-40')} />)
        }
        renderTrailingIcon={() => renderAction(props)}
      />
    ),
    [NotificationType.Warning]: (props) => (
      <BaseToast
        {...defaultProps}
        {...props}
        renderLeadingIcon={() =>
          renderIcon(<Warning {...iconDefaultProps} weight="fill" color={getColor('text-yellow-30')} />)
        }
        renderTrailingIcon={() => renderAction(props)}
      />
    ),
    [NotificationType.Error]: (props) => (
      <BaseToast
        {...defaultProps}
        {...props}
        renderLeadingIcon={() =>
          renderIcon(<WarningOctagon {...iconDefaultProps} weight="fill" color={getColor('text-red-50')} />)
        }
        renderTrailingIcon={() => renderAction(props)}
      />
    ),
    [NotificationType.Upload]: (props) => (
      <BaseToast
        {...defaultProps}
        {...props}
        renderLeadingIcon={() =>
          renderIcon(<ArrowCircleUp {...iconDefaultProps} weight="fill" color={getColor('text-blue-60')} />)
        }
        renderTrailingIcon={() => renderAction(props)}
      />
    ),
    [NotificationType.Download]: (props) => (
      <BaseToast
        {...defaultProps}
        {...props}
        renderLeadingIcon={() =>
          renderIcon(<ArrowCircleDown {...iconDefaultProps} weight="fill" color={getColor('text-blue-60')} />)
        }
        renderTrailingIcon={() => renderAction(props)}
      />
    ),
  };

  return (
    <Portal>
      <Toast config={config} />
    </Portal>
  );
};

export default AppToast;
