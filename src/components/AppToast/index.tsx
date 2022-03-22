import { ReactNode } from 'react';
import * as Unicons from '@iconscout/react-native-unicons';
import Toast, { BaseToast, BaseToastProps, ToastConfigParams } from 'react-native-toast-message';
import { CheckCircle } from 'phosphor-react-native';

import { ToastType } from '../../types';
import { getColor, tailwind } from '../../helpers/designSystem';
import { CheckBox, Dimensions, View } from 'react-native';

const AppToast = (): JSX.Element => {
  const screenDimensions = Dimensions.get('screen');
  const defaultProps: BaseToastProps = {
    text1NumberOfLines: 1,
    style: {
      ...tailwind('rounded-xl border-0 border-neutral-20 border px-3.5 h-12'),
      width: screenDimensions.width - 24,
    },
    contentContainerStyle: tailwind('p-0'),
    text1Style: tailwind('text-base text-neutral-700 font-normal m-0'),
    text2Style: tailwind('text-xs text-neutral-100'),
  };
  const iconDefaultProps = {
    size: 20,
  };
  const renderIcon = (icon: ReactNode) => <View style={tailwind('justify-center mr-2.5')}>{icon}</View>;
  const config: {
    [key in ToastType]: (props: ToastConfigParams<Record<string, never>>) => ReactNode;
  } = {
    [ToastType.Info]: (props) => <BaseToast {...defaultProps} {...props} />,
    [ToastType.Success]: (props) => (
      <BaseToast
        {...defaultProps}
        {...props}
        renderLeadingIcon={() => renderIcon(<CheckCircle {...iconDefaultProps} color={getColor('green-40')} />)}
      />
    ),
    [ToastType.Warning]: (props) => (
      <BaseToast
        {...defaultProps}
        {...props}
        renderLeadingIcon={() =>
          renderIcon(<Unicons.UilExclamationTriangle {...iconDefaultProps} color={getColor('yellow-30')} />)
        }
      />
    ),
    [ToastType.Error]: (props) => (
      <BaseToast
        {...defaultProps}
        {...props}
        renderLeadingIcon={() =>
          renderIcon(<Unicons.UilTimesCircle {...iconDefaultProps} color={getColor('red-60')} />)
        }
      />
    ),
    [ToastType.Upload]: (props) => (
      <BaseToast
        {...defaultProps}
        {...props}
        renderLeadingIcon={() => renderIcon(<Unicons.UilArrowCircleUp color={getColor('blue-60')} size={20} />)}
      />
    ),
    [ToastType.Download]: (props) => (
      <BaseToast
        {...props}
        contentContainerStyle={{}}
        renderLeadingIcon={() => renderIcon(<Unicons.UilArrowCircleDown color={getColor('blue-60')} size={20} />)}
      />
    ),
  };

  return <Toast config={config} />;
};

export default AppToast;
