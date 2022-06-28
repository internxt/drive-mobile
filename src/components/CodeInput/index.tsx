import _ from 'lodash';
import { StyleProp, View, ViewStyle } from 'react-native';
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
  const tailwind = useTailwind();
  const renderInputs = () =>
    _.times(props.length).map((n, index) => {
      const isTheLast = index === props.length - 1;
      const digitValue = props.value[index] || '';
      const onDigitChangeText = (text: string) => {
        const newValue = props.value.substring(0, index) + text + props.value.substring(index + 1);

        props.onChange(newValue);
        newValue.length === props.length && props.onComplete?.(newValue);
      };

      return (
        <AppTextInput
          key={n}
          maxLength={1}
          style={tailwind('text-center py-3.5 px-0')}
          containerStyle={[tailwind('flex-1'), !isTheLast && tailwind('mr-2')]}
          value={digitValue}
          onChangeText={onDigitChangeText}
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
