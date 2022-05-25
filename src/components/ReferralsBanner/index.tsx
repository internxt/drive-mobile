import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { getColor, tailwind } from '../../helpers/designSystem';
import strings from '../../../assets/lang/strings';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { uiActions } from '../../store/slices/ui';
import { TouchableWithoutFeedback } from 'react-native';
import { X } from 'phosphor-react-native';
import AppText from '../AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootScreenNavigationProp } from '../../types/navigation';

const ReferralsBanner = (): JSX.Element => {
  const safeAreaInsets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const navigation = useNavigation<RootScreenNavigationProp<'TabExplorer'>>();
  const isOpen = useAppSelector((state) => state.ui.isReferralsBannerOpen);
  const onBannerPressed = () => {
    navigation.navigate('Storage');
    dispatch(uiActions.setIsReferralsBannerOpen(false));
  };
  const onCloseButtonPressed = () => {
    dispatch(uiActions.setIsReferralsBannerOpen(false));
  };

  return isOpen ? (
    <View
      style={[
        tailwind('absolute bottom-14 w-full px-5 bg-blue-60 flex-row justify-between items-center'),
        { marginBottom: safeAreaInsets.bottom },
      ]}
    >
      <AppText onPress={onBannerPressed} style={tailwind('flex-grow py-2.5 text-white text-lg')}>
        {strings.components.ReferralsBanner.message}
      </AppText>
      <TouchableWithoutFeedback onPress={onCloseButtonPressed}>
        <View style={tailwind('p-2')}>
          <X color={getColor('blue-40')} size={26} />
        </View>
      </TouchableWithoutFeedback>
    </View>
  ) : (
    <View></View>
  );
};

export default ReferralsBanner;
