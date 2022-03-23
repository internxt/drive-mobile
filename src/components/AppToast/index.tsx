import { ReactNode } from 'react';
import Toast, { BaseToast, BaseToastProps, ToastConfigParams } from 'react-native-toast-message';
import { ArrowCircleDown, ArrowCircleUp, CheckCircle, Warning, WarningOctagon } from 'phosphor-react-native';

import { ToastType } from '../../types';
import { getColor, tailwind } from '../../helpers/designSystem';
import { Dimensions, Text, TouchableHighlight, View } from 'react-native';
import strings from '../../../assets/lang/strings';

const AppToast = (): JSX.Element => {
  const screenDimensions = Dimensions.get('screen');
  const defaultProps: BaseToastProps = {
    text1NumberOfLines: 1,
    style: {
      ...tailwind('rounded-xl border-0 border-neutral-20 border pl-3.5 h-12'),
      width: screenDimensions.width - 24,
    },
    contentContainerStyle: tailwind('p-0'),
    text1Style: tailwind('text-base text-neutral-700 font-normal m-0 pr-3.5'),
    text2Style: tailwind('text-xs text-neutral-100'),
  };
  const iconDefaultProps = {
    size: 20,
  };
  const renderIcon = (icon: ReactNode) => <View style={tailwind('justify-center mr-2.5')}>{icon}</View>;
  const renderAction = (text: string, callback: () => void) => (
    <TouchableHighlight onPress={callback} underlayColor={getColor('neutral-30')} style={tailwind('rounded-r-xl ')}>
      <View style={tailwind('justify-center flex-1 px-3.5')}>
        <Text style={tailwind('text-blue-60 text-base')}>{text}</Text>
      </View>
    </TouchableHighlight>
  );
  const config: {
    [key in ToastType]: (props: ToastConfigParams<Record<string, never>>) => ReactNode;
  } = {
    [ToastType.Info]: (props) => (
      <BaseToast
        {...defaultProps}
        {...props}
        renderTrailingIcon={() => renderAction(strings.components.buttons.dismiss, () => props.hide())}
      />
    ),
    [ToastType.Success]: (props) => (
      <BaseToast
        {...defaultProps}
        {...props}
        renderLeadingIcon={() =>
          renderIcon(<CheckCircle {...iconDefaultProps} weight="fill" color={getColor('green-40')} />)
        }
        renderTrailingIcon={() => renderAction(strings.components.buttons.dismiss, () => props.hide())}
      />
    ),
    [ToastType.Warning]: (props) => (
      <BaseToast
        {...defaultProps}
        {...props}
        renderLeadingIcon={() =>
          renderIcon(<Warning {...iconDefaultProps} weight="fill" color={getColor('yellow-30')} />)
        }
        renderTrailingIcon={() => renderAction(strings.components.buttons.dismiss, () => props.hide())}
      />
    ),
    [ToastType.Error]: (props) => (
      <BaseToast
        {...defaultProps}
        {...props}
        renderLeadingIcon={() =>
          renderIcon(<WarningOctagon {...iconDefaultProps} weight="fill" color={getColor('red-50')} />)
        }
        renderTrailingIcon={() => renderAction(strings.components.buttons.dismiss, () => props.hide())}
      />
    ),
    [ToastType.Upload]: (props) => (
      <BaseToast
        {...defaultProps}
        {...props}
        renderLeadingIcon={() =>
          renderIcon(<ArrowCircleUp {...iconDefaultProps} weight="fill" color={getColor('blue-60')} />)
        }
        renderTrailingIcon={() => renderAction(strings.components.buttons.dismiss, () => props.hide())}
      />
    ),
    [ToastType.Download]: (props) => (
      <BaseToast
        {...defaultProps}
        {...props}
        renderLeadingIcon={() =>
          renderIcon(<ArrowCircleDown {...iconDefaultProps} weight="fill" color={getColor('blue-60')} />)
        }
        renderTrailingIcon={() => renderAction(strings.components.buttons.dismiss, () => props.hide())}
      />
    ),
  };

  return <Toast config={config} />;
};

export default AppToast;
