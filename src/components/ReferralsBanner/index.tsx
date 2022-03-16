import { Text, View } from 'react-native';
import * as Unicons from '@iconscout/react-native-unicons';
import { useNavigation } from '@react-navigation/native';
import { NavigationStackProp } from 'react-navigation-stack';

import { getColor, tailwind } from '../../helpers/designSystem';
import strings from '../../../assets/lang/strings';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { layoutActions } from '../../store/slices/layout';
import { TouchableWithoutFeedback } from 'react-native';
import { AppScreenKey } from '../../types';

const ReferralsBanner = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NavigationStackProp>();
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
            <Unicons.UilTimes color={getColor('blue-40')} size={26} />
          </TouchableWithoutFeedback>
        </>
      </View>
    </TouchableWithoutFeedback>
  ) : (
    <View></View>
  );
};

export default ReferralsBanner;
