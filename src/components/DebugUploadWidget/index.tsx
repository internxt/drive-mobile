import { StyleProp, View, ViewStyle } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import strings from '../../../assets/lang/strings';
import AppButton from '../AppButton';
import AppText from '../AppText';

interface DebugUploadWidgetProps {
  style?: StyleProp<ViewStyle>;
}

const DebugUploadWidget = (props: DebugUploadWidgetProps): JSX.Element => {
  const tailwind = useTailwind();
  const onUploadButtonPressed = () => undefined;

  return (
    <View style={[tailwind('px-5'), props.style]}>
      <AppText style={tailwind('text-xl')}>{strings.screens.DebugScreen.upload.title}</AppText>
      <AppText style={tailwind('text-gray-50 text-base')}>{strings.screens.DebugScreen.upload.advice}</AppText>

      <View style={tailwind('h-3')}></View>

      <AppButton title={strings.buttons.uploadFiles} type="accept" onPress={onUploadButtonPressed} />
    </View>
  );
};

export default DebugUploadWidget;
