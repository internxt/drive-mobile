import { isString } from 'lodash';
import { useState } from 'react';
import { StyleProp, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../hooks/useColor';
import AppText from '../AppText';

interface AppTextInputProps extends TextInputProps {
  status?: ['idle' | 'warning' | 'error' | 'success', string | JSX.Element | undefined];
  containerStyle?: StyleProp<ViewStyle>;
  label?: string;
  renderAppend?: ({ isFocused }: { isFocused: boolean }) => JSX.Element | undefined;
  inputRef?: React.LegacyRef<TextInput>;
}

const AppTextInput = (props: AppTextInputProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const [isFocused, setIsFocused] = useState(false);
  const editable = props.editable !== false;
  const [status, statusMessage] = props.status || ['idle', ''];
  const renderStatusMessage = () => {
    let template: JSX.Element | undefined = undefined;

    if (statusMessage) {
      if (isString(statusMessage)) {
        template = (
          <AppText
            medium={status === 'error'}
            style={[
              tailwind('mt-1 text-sm'),
              status === 'success' && tailwind('text-green-'),
              status === 'warning' && tailwind('text-warning-'),
              status === 'error' && tailwind('text-red-'),
            ]}
          >
            {statusMessage}
          </AppText>
        );
      } else {
        template = statusMessage;
      }
    }

    return template;
  };

  return (
    <View style={props.containerStyle}>
      {props.label && <AppText style={tailwind('text-sm mb-1')}>{props.label}</AppText>}
      <View
        style={[
          tailwind('flex-row items-center rounded-lg border border-gray-20 py-1.5'),
          isFocused && tailwind('border-primary'),
          status === 'error' && tailwind('border-red-'),
          status === 'warning' && tailwind('border-orange-'),
          status === 'success' && tailwind('border-green-'),
          !editable && tailwind('border-gray-10'),
        ]}
      >
        <TextInput
          placeholderTextColor={getColor('text-gray-30')}
          {...props}
          style={[tailwind('flex-1 text-gray-80 py-2 px-4'), props.style]}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          ref={props.inputRef}
        />
        {props.renderAppend && <View style={tailwind('px-4')}>{props.renderAppend({ isFocused })}</View>}
      </View>

      {renderStatusMessage()}
    </View>
  );
};

export default AppTextInput;
