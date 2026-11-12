import { StyleProp, View, ViewStyle } from 'react-native';

import strings from '../../../assets/lang/strings';
import AppButton from '../AppButton';
import AppText from '../AppText';
import { cssInterop } from 'nativewind';

interface DebugDownloadWidgetProps {
  style?: StyleProp<ViewStyle>;
  className?: string;
}

const DebugDownloadWidget = (props: DebugDownloadWidgetProps): JSX.Element => {
  const onUploadButtonPressed = () => undefined;

  return (
    <View className="px-5" style={props.style}>
      <AppText className="text-xl">{strings.screens.DebugScreen.download.title}</AppText>
      <AppText className="text-gray-50 text-base">{strings.screens.DebugScreen.download.advice}</AppText>

      <View className="h-3"></View>

      <AppButton title={strings.buttons.download} type="accept" onPress={onUploadButtonPressed} />
    </View>
  );
};

cssInterop(DebugDownloadWidget, { className: 'style' });

export default DebugDownloadWidget;
