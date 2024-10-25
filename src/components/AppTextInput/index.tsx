import { isString } from 'lodash';
import { useRef, useState } from 'react';
import {
  NativeSyntheticEvent,
  Platform,
  StyleProp,
  TextInput,
  TextInputFocusEventData,
  TextInputProps,
  TextInputSelectionChangeEventData,
  View,
  ViewStyle,
} from 'react-native';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../hooks/useColor';
import AppText from '../AppText';

export interface AppTextInputProps extends TextInputProps {
  status?: ['idle' | 'warning' | 'error' | 'success', string | JSX.Element | undefined];
  containerStyle?: StyleProp<ViewStyle>;
  wrapperStyle?: StyleProp<ViewStyle>;
  label?: string;
  renderAppend?: ({ isFocused }: { isFocused: boolean }) => JSX.Element | undefined;
  inputRef?: React.LegacyRef<TextInput>;
}

const AppTextInput = (props: AppTextInputProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const [isFocused, setIsFocused] = useState(false);
  const [selection, setSelection] = useState<{ start: number; end: number } | undefined>();
  const localInputRef = useRef<TextInput>(null);
  const editable = props.editable !== false;
  const [status, statusMessage] = props.status || ['idle', ''];
  const isAndroid = Platform.OS === 'android';

  const handleSelectionChange = (event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
    if (isAndroid) {
      const newSelection = event.nativeEvent.selection;
      setSelection(newSelection);
    }
  };

  const handleOnFocusInput = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(true);
    if (isAndroid && props.value && (!selection || (selection.start === 0 && selection.end === 0))) {
      const position = props.value.length;
      setSelection({ start: position, end: position });
    }
    props.onFocus?.(e);
  };

  // Added selection prop handler to resolve Android input cursor position bug
  const handleChangeText = (newText: string) => {
    if (isAndroid && selection) {
      const oldText = props.value || '';
      let newPosition: number;

      const hasNothingSelected = selection.start === selection.end;
      if (hasNothingSelected) {
        newPosition = selection.start + (newText.length - oldText.length);
        setSelection({ start: newPosition, end: newPosition });
      } else {
        const selectionStart = Math.min(selection.start, selection.end);
        newPosition = selectionStart + newText.length - oldText.slice(selection.start, selection.end).length;
        setSelection({ start: newPosition, end: newPosition });
      }

      setTimeout(() => {
        if (localInputRef.current) {
          localInputRef.current.setNativeProps({
            selection: { start: newPosition, end: newPosition },
          });
        }
      }, 0);
    }

    props.onChangeText?.(newText);
  };

  const renderStatusMessage = () => {
    let template: JSX.Element | undefined = undefined;

    if (statusMessage) {
      if (isString(statusMessage)) {
        template = (
          <AppText
            medium={status === 'error'}
            style={[
              tailwind('mt-1 text-sm'),
              status === 'success' && tailwind('text-green'),
              status === 'warning' && tailwind('text-warning-'),
              status === 'error' && tailwind('text-red'),
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

  const inputProps = {
    ...props,
    ref: props.inputRef || localInputRef,
    onChangeText: isAndroid ? handleChangeText : props.onChangeText,
    onSelectionChange: isAndroid ? handleSelectionChange : props.onSelectionChange,
    selection: isAndroid ? selection : props.selection,
  };

  return (
    <View style={props.containerStyle}>
      {props.label && <AppText style={tailwind('text-sm mb-1')}>{props.label}</AppText>}
      <View
        style={[
          tailwind('flex-row items-center rounded-lg border border-gray-20 py-1.5'),
          isFocused && tailwind('border-primary'),
          status === 'error' && tailwind('border-red'),
          status === 'warning' && tailwind('border-orange'),
          status === 'success' && tailwind('border-green'),
          !editable && tailwind('border-gray-10'),
          props.wrapperStyle,
        ]}
      >
        <TextInput
          placeholderTextColor={getColor('text-gray-30')}
          {...inputProps}
          style={[tailwind('flex-1 text-gray-80 py-2 px-4'), props.style]}
          onFocus={handleOnFocusInput}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
        />
        {props.renderAppend && <View style={tailwind('px-4')}>{props.renderAppend({ isFocused })}</View>}
      </View>

      {renderStatusMessage()}
    </View>
  );
};

export default AppTextInput;
