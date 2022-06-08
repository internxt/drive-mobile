import { StyleProp, View, ViewStyle } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import strings from '../../../assets/lang/strings';
import AppButton from '../AppButton';
import AppText from '../AppText';

interface DebugDownloadWidgetProps {
  style?: StyleProp<ViewStyle>;
}

const DebugDownloadWidget = (props: DebugDownloadWidgetProps): JSX.Element => {
  const tailwind = useTailwind();
  const onUploadButtonPressed = () => undefined;

  return (
    <View style={[tailwind('px-5'), props.style]}>
      <AppText style={tailwind('text-xl')}>{strings.screens.DebugScreen.download.title}</AppText>
      <AppText style={tailwind('text-neutral-200 text-base')}>{strings.screens.DebugScreen.download.advice}</AppText>

      <View style={tailwind('h-3')}></View>

      <AppButton title={strings.components.buttons.download} type="accept" onPress={onUploadButtonPressed} />
    </View>
  );
};

export default DebugDownloadWidget;
