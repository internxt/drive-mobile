import { StyleProp, View, ViewStyle } from 'react-native';

import strings from '../../../assets/lang/strings';
import AppButton from '../AppButton';
import AppText from '../AppText';
import { cssInterop } from 'nativewind';

interface DebugUploadWidgetProps {
  style?: StyleProp<ViewStyle>;
  className?: string;
}

const DebugUploadWidget = (props: DebugUploadWidgetProps): JSX.Element => {
  const onUploadButtonPressed = () => undefined;

  return (
    <View className="px-5" style={props.style}>
      <AppText className="text-xl">{strings.screens.DebugScreen.upload.title}</AppText>
      <AppText className="text-gray-50 text-base">{strings.screens.DebugScreen.upload.advice}</AppText>

      <View className="h-3"></View>

      <AppButton title={strings.buttons.uploadFiles} type="accept" onPress={onUploadButtonPressed} />
    </View>
  );
};

cssInterop(DebugUploadWidget, { className: 'style' });

export default DebugUploadWidget;
