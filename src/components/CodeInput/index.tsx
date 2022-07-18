import _ from 'lodash';
import { createRef, useState } from 'react';
import { NativeSyntheticEvent, StyleProp, TextInput, TextInputKeyPressEventData, View, ViewStyle } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import AppText from '../AppText';
import AppTextInput from '../AppTextInput';

interface CodeInputProps {
  length: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  style?: StyleProp<ViewStyle>;
  label?: string;
}
const CodeInput = (props: CodeInputProps) => {
  const [refs] = useState(_.times(props.length).map(() => createRef<TextInput>()));
  const tailwind = useTailwind();
  const renderInputs = () =>
    _.times(props.length).map((n, index) => {
      const isTheLast = index === props.length - 1;
      const digitValue = props.value[index] || '';
      const onDigitChangeText = (text: string) => {
        const newValue = props.value.substring(0, index) + text + props.value.substring(index + 1);

        props.onChange(newValue);

        if (newValue.length - 1 === index && !isTheLast) {
          refs[index + 1].current?.focus();
        } else {
          const lastIndex = newValue.length - 1 >= 0 ? newValue.length - 1 : 0;
          refs[lastIndex].current?.focus();
        }

        newValue.length === props.length && props.onComplete?.(newValue);
      };
      const onDigitKeyPressed = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
        if (e.nativeEvent.key === 'Backspace') {
          const lastIndex = props.value.length - 1 >= 0 ? props.value.length - 1 : 0;
          refs[lastIndex].current?.focus();
        }
      };

      return (
        <AppTextInput
          key={n}
          maxLength={1}
          inputRef={refs[index]}
          style={tailwind('text-center py-3.5 px-0')}
          containerStyle={[tailwind('flex-1'), !isTheLast && tailwind('mr-2')]}
          value={digitValue}
          onChangeText={onDigitChangeText}
          onKeyPress={onDigitKeyPressed}
          keyboardType="numeric"
        />
      );
    });

  return (
    <View style={props.style}>
      {props.label && <AppText style={tailwind('text-sm mb-1')}>{props.label}</AppText>}
      <View style={tailwind('flex-row')}>{renderInputs()}</View>
    </View>
  );
};

export default CodeInput;
