import { StyleProp, View, ViewStyle } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import strings from '../../../assets/lang/strings';
import { useAppDispatch } from '../../store/hooks';
import { photosThunks } from '../../store/slices/photos';
import AppButton from '../AppButton';
import AppText from '../AppText';

interface DebugPhotosWidgetProps {
  style?: StyleProp<ViewStyle>;
}

const DebugPhotosWidget = (props: DebugPhotosWidgetProps): JSX.Element => {
  const tailwind = useTailwind();
  const dispatch = useAppDispatch();
  const onResetPhotosFilesystemData = async () => {
    dispatch(photosThunks.clearPhotosThunk());
  };

  return (
    <View style={[tailwind('px-5'), props.style]}>
      <AppText style={tailwind('text-xl')}>{strings.screens.DebugScreen.photos.title}</AppText>
      <AppText style={tailwind('text-neutral-200 text-base')}>{strings.screens.DebugScreen.photos.advice}</AppText>

      <View style={tailwind('h-3')}></View>
      <AppButton
        title={strings.screens.DebugScreen.photos.resetPhotosData}
        type="accept"
        onPress={onResetPhotosFilesystemData}
      />
    </View>
  );
};

export default DebugPhotosWidget;
