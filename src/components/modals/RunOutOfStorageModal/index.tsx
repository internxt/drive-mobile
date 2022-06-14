import React, { useEffect } from 'react';
import prettysize from 'prettysize';
import { Text, View, TouchableWithoutFeedback, TouchableHighlight } from 'react-native';
import Modal from 'react-native-modalbox';
import { useNavigation } from '@react-navigation/native';

import RunOutImage from '../../../../assets/images/modals/runout.svg';
import globalStyle from '../../../styles/global';
import strings from '../../../../assets/lang/strings';
import { INFINITE_PLAN } from '../../../types';
import { uiActions } from '../../../store/slices/ui';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import paymentService from '../../../services/PaymentService';
import { RootScreenNavigationProp } from '../../../types/navigation';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../../hooks/useColor';

function RunOutOfStorageModal(): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const navigation = useNavigation<RootScreenNavigationProp<'TabExplorer'>>();
  const { usage: photosUsage } = useAppSelector((state) => state.photos);
  const { usage: storageUsage, limit } = useAppSelector((state) => state.drive);
  const { showRunOutOfSpaceModal } = useAppSelector((state) => state.ui);
  const usage = photosUsage + storageUsage;
  const getLimitString = () => {
    if (limit === 0) {
      return '...';
    }

    if (limit >= INFINITE_PLAN) {
      return '\u221E';
    }

    return prettysize(limit, true);
  };
  const getUsageString = () => {
    return prettysize(usage);
  };
  const onUpgradeNowButtonPressed = () => {
    dispatch(uiActions.setShowRunOutSpaceModal(false));
    navigation.push('Billing');
  };

  useEffect(() => {
    paymentService.getCurrentIndividualPlan().catch(() => undefined);
  }, []);

  return (
    <Modal
      position="bottom"
      style={tailwind('bg-transparent')}
      isOpen={showRunOutOfSpaceModal}
      onClosed={() => {
        dispatch(uiActions.setShowDeleteModal(false));
        dispatch(uiActions.setShowRunOutSpaceModal(false));
      }}
      backButtonClose={true}
      backdropPressToClose={true}
      animationDuration={250}
    >
      <View style={tailwind('h-full')}>
        <TouchableWithoutFeedback
          style={tailwind('flex-grow')}
          onPress={() => {
            dispatch(uiActions.setShowRunOutSpaceModal(false));
          }}
        >
          <View style={tailwind('flex-grow')} />
        </TouchableWithoutFeedback>

        <View>
          <View style={tailwind('flex-row bg-white px-5 py-3 rounded-t-xl justify-center')}>
            <View style={tailwind('h-1 w-20 bg-neutral-30 rounded-full')} />
          </View>

          <View style={tailwind('bg-white justify-center px-5 pt-3 pb-8')}>
            <Text style={[tailwind('text-center text-lg text-neutral-500'), globalStyle.fontWeight.medium]}>
              {strings.modals.OutOfSpaceModal.title}
            </Text>

            <View style={tailwind('items-center my-6')}>
              <View style={tailwind('items-center')}>
                <RunOutImage width={80} height={80} />
              </View>

              <Text style={[tailwind('text-sm text-neutral-100 mt-3'), globalStyle.fontWeight.medium]}>
                {strings.screens.storage.space.used.used} {getUsageString()} {strings.screens.storage.space.used.of}{' '}
                {getLimitString()}
              </Text>
            </View>

            <View style={tailwind('flex-grow mb-6')}>
              <Text style={tailwind('text-sm text-center text-neutral-100')}>
                {strings.modals.OutOfSpaceModal.advice}
              </Text>
            </View>

            <TouchableHighlight
              underlayColor={getColor('text-blue-70')}
              style={tailwind('bg-blue-60 rounded-lg py-2 mx-6 items-center justify-center')}
              onPress={onUpgradeNowButtonPressed}
            >
              <Text style={[tailwind('text-lg text-white'), globalStyle.fontWeight.medium]}>
                {strings.buttons.upgradeNow}
              </Text>
            </TouchableHighlight>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default RunOutOfStorageModal;
