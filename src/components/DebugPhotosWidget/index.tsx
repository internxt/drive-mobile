import { ArrowCircleDown, ArrowCircleUp, CheckCircle, Warning, WarningOctagon } from 'phosphor-react-native';
import { FlatList, StyleProp, View, ViewStyle } from 'react-native';
import { useSelector } from 'react-redux';

import strings from '../../../assets/lang/strings';
import { getColor, tailwind } from '../../helpers/designSystem';
import notificationsService from '../../services/NotificationsService';
import { PhotosService } from '../../services/PhotosService';
import { useAppSelector } from '../../store/hooks';
import { NotificationType } from '../../types';
import AppButton from '../AppButton';
import AppText from '../AppText';

interface DebugPhotosWidgetProps {
  style?: StyleProp<ViewStyle>;
}

const DebugPhotosWidget = (props: DebugPhotosWidgetProps): JSX.Element => {
  const auth = useAppSelector((selector) => selector.auth);
  const onResetPhotosFilesystemData = async () => {
    const user = auth.user;
    try {
      await PhotosService.initialize(auth.photosToken || '', {
        encryptionKey: user?.mnemonic || '',
        user: user?.bridgeUser || '',
        password: user?.userId || '',
      });
      PhotosService.instance.clearData();
      notificationsService.show({
        text1: strings.screens.DebugScreen.photos.resetSuccess,
        type: NotificationType.Success,
      });
    } catch (e) {
      notificationsService.show({
        text1: strings.screens.DebugScreen.photos.resetError,
        type: NotificationType.Error,
      });
    }
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
