import { StyleProp, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { tailwind } from '../../helpers/designSystem';

const AppTextInput = (props: TextInputProps & { containerStyle?: StyleProp<ViewStyle> }): JSX.Element => {
  return (
    <View style={[!props.editable && tailwind('bg-neutral-20 rounded-lg'), props.containerStyle]}>
      <TextInput style={tailwind('text-neutral-100 py-2')} {...props} />
    </View>
  );
};

export default AppTextInput;
