import { Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { getColor, tailwind } from '../../helpers/designSystem';
import strings from '../../../assets/lang/strings';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { layoutActions } from '../../store/slices/layout';
import { TouchableWithoutFeedback } from 'react-native';
import { AppScreenKey } from '../../types';
import { X } from 'phosphor-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

const ReferralsBanner = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const isOpen = useAppSelector((state) => state.layout.isReferralsBannerOpen);
  const onBannerPressed = () => {
    navigation.navigate(AppScreenKey.Storage);
    dispatch(layoutActions.setIsReferralsBannerOpen(false));
  };
  const onCloseButtonPressed = () => {
    dispatch(layoutActions.setIsReferralsBannerOpen(false));
  };

  return isOpen ? (
    <TouchableWithoutFeedback onPress={onBannerPressed}>
      <View style={tailwind('absolute bottom-14 w-full px-5 py-2.5 bg-blue-60 flex-row justify-between items-center')}>
        <>
          <Text style={tailwind('text-white text-lg')}>{strings.components.ReferralsBanner.message}</Text>
          <TouchableWithoutFeedback onPress={onCloseButtonPressed}>
            <X color={getColor('blue-40')} size={26} />
          </TouchableWithoutFeedback>
        </>
      </View>
    </TouchableWithoutFeedback>
  ) : (
    <View></View>
  );
};

export default ReferralsBanner;
