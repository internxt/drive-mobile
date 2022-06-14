import { forwardRef } from 'react';
import { StyleProp, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import AppText from '../AppText';

interface AppTextInputProps extends TextInputProps {
  containerStyle?: StyleProp<ViewStyle>;
  label?: string;
  renderAppend?: () => JSX.Element;
}

const AppTextInput = forwardRef<TextInput, AppTextInputProps>((props, ref): JSX.Element => {
  const tailwind = useTailwind();
  const editable = props.editable !== false;

  return (
    <View style={props.containerStyle}>
      {props.label && <AppText style={tailwind('text-sm mb-1')}>{props.label}</AppText>}
      <View
        style={[
          tailwind('flex-row items-center rounded-lg border border-gray-10 px-4 py-1.5'),
          !editable && tailwind('bg-neutral-20'),
        ]}
      >
        <TextInput style={tailwind('flex-1 text-gray-80 py-2')} {...props} ref={ref} />
        {props.renderAppend && <View style={tailwind('pl-4')}>{props.renderAppend()}</View>}
      </View>
    </View>
  );
});

export default AppTextInput;
