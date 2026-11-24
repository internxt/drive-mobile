import { ReactNode } from 'react';
import Toast, { BaseToast, BaseToastProps, ToastConfigParams } from 'react-native-toast-message';
import { ArrowCircleDown, ArrowCircleUp, CheckCircle, Warning, WarningOctagon } from 'phosphor-react-native';

import { AppToastExtraProps, NotificationType } from '../../types';
import { Dimensions, Text, TouchableHighlight, View } from 'react-native';
import strings from '../../../assets/lang/strings';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useGetColor from '../../hooks/useColor';
import styles from '../../styles/global';

const TOAST_MIN_HEIGHT = 48;
const TOAST_TEXT_MAX_LINE_COUNT = 8;
const TOAST_BORDER_RADIUS = 12;
const TOAST_BORDER_WIDTH = 1;
const TOAST_BORDER_COLOR = 'rgb(229, 229, 235)';
const TOAST_HORIZONTAL_PADDING = 14;
const TOAST_VERTICAL_PADDING = 12;
const TOAST_TITLE_FONT_SIZE = 16;
const TOAST_TITLE_LINE_HEIGHT = 24;
const TOAST_TITLE_COLOR = 'rgb(24, 24, 27)';
const TOAST_SUBTITLE_FONT_SIZE = 12;
const TOAST_SUBTITLE_LINE_HEIGHT = 16;
const TOAST_SUBTITLE_COLOR = 'rgb(142, 142, 148)';

const AppToast = (): JSX.Element => {
  const getColor = useGetColor();
  const safeAreaInsets = useSafeAreaInsets();
  const screenDimensions = Dimensions.get('screen');
  const defaultProps: BaseToastProps = {
    text1NumberOfLines: TOAST_TEXT_MAX_LINE_COUNT,
    style: {
      borderRadius: TOAST_BORDER_RADIUS,
      borderWidth: TOAST_BORDER_WIDTH,
      borderColor: TOAST_BORDER_COLOR,
      paddingLeft: TOAST_HORIZONTAL_PADDING,
      height: 'auto',
      minHeight: TOAST_MIN_HEIGHT,
      width: screenDimensions.width - 24,
      marginBottom: safeAreaInsets.bottom,
    },
    contentContainerStyle: { paddingHorizontal: 0, paddingVertical: TOAST_VERTICAL_PADDING },
    text1Style: {
      fontSize: TOAST_TITLE_FONT_SIZE,
      lineHeight: TOAST_TITLE_LINE_HEIGHT,
      color: TOAST_TITLE_COLOR,
      fontWeight: '400',
      margin: 0,
      paddingRight: TOAST_HORIZONTAL_PADDING,
      fontFamily: styles.fontWeight.regular.fontFamily,
    },
    text2Style: {
      fontSize: TOAST_SUBTITLE_FONT_SIZE,
      lineHeight: TOAST_SUBTITLE_LINE_HEIGHT,
      color: TOAST_SUBTITLE_COLOR,
      fontFamily: styles.fontWeight.regular.fontFamily,
    },
  };
  const iconDefaultProps = {
    size: 20,
  };
  const renderIcon = (icon: ReactNode) => <View className="justify-center mr-2.5">{icon}</View>;
  const renderAction = (toastProps: ToastConfigParams<AppToastExtraProps>) => {
    const callback = () => {
      if (toastProps.props.action) {
        toastProps.props.action.onActionPress();
      }
      toastProps.hide();
    };

    const text = toastProps.props.action ? toastProps.props.action.text : strings.buttons.dismiss;
    return (
      <TouchableHighlight onPress={callback} underlayColor={getColor('text-gray-5')} className="rounded-r-xl">
        <View className="justify-center flex-1 px-3.5">
          <Text className="text-primary text-base">{text}</Text>
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
          renderIcon(<CheckCircle {...iconDefaultProps} weight="fill" color={getColor('text-green')} />)
        }
        renderTrailingIcon={() => renderAction(props)}
      />
    ),
    [NotificationType.Warning]: (props) => (
      <BaseToast
        {...defaultProps}
        {...props}
        renderLeadingIcon={() =>
          renderIcon(<Warning {...iconDefaultProps} weight="fill" color={getColor('text-yellow')} />)
        }
        renderTrailingIcon={() => renderAction(props)}
      />
    ),
    [NotificationType.Error]: (props) => (
      <BaseToast
        {...defaultProps}
        {...props}
        renderLeadingIcon={() =>
          renderIcon(<WarningOctagon {...iconDefaultProps} weight="fill" color={getColor('text-red')} />)
        }
        renderTrailingIcon={() => renderAction(props)}
      />
    ),
    [NotificationType.Upload]: (props) => (
      <BaseToast
        {...defaultProps}
        {...props}
        renderLeadingIcon={() =>
          renderIcon(<ArrowCircleUp {...iconDefaultProps} weight="fill" color={getColor('text-primary')} />)
        }
        renderTrailingIcon={() => renderAction(props)}
      />
    ),
    [NotificationType.Download]: (props) => (
      <BaseToast
        {...defaultProps}
        {...props}
        renderLeadingIcon={() =>
          renderIcon(<ArrowCircleDown {...iconDefaultProps} weight="fill" color={getColor('text-primary')} />)
        }
        renderTrailingIcon={() => renderAction(props)}
      />
    ),
  };

  return <Toast config={config} />;
};

export default AppToast;
