import { ArrowCircleDown, ArrowCircleUp, CheckCircle, Warning, WarningOctagon } from 'phosphor-react-native';
import { FlatList, StyleProp, View, ViewStyle } from 'react-native';
import { useSelector } from 'react-redux';

import strings from '../../../assets/lang/strings';
import { getColor, tailwind } from '../../helpers/designSystem';
import notificationsService from '../../services/NotificationsService';
import { PhotosService } from '../../services/photos';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { photosThunks } from '../../store/slices/photos';
import { NotificationType } from '../../types';
import AppButton from '../AppButton';
import AppText from '../AppText';

interface DebugPhotosWidgetProps {
  style?: StyleProp<ViewStyle>;
}

const DebugPhotosWidget = (props: DebugPhotosWidgetProps): JSX.Element => {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((selector) => selector.auth);
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