import React, { useEffect, useState } from 'react';
import prettysize from 'prettysize';
import { Text, View, Platform, TouchableWithoutFeedback, TouchableHighlight } from 'react-native';
import Modal from 'react-native-modalbox';
import { useNavigation } from '@react-navigation/native';
import { NavigationStackProp } from 'react-navigation-stack';

import RunOutImage from '../../../../assets/images/modals/runout.svg';
import { tailwind, getColor } from '../../../helpers/designSystem';
import globalStyle from '../../../styles/global.style';
import strings from '../../../../assets/lang/strings';
import { AppScreenKey, CurrentPlan, INFINITE_PLAN } from '../../../types';
import { layoutActions } from '../../../store/slices/layout';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import paymentService from '../../../services/payment';

function RunOutOfStorageModal(): JSX.Element {
  const [currentPlan, setCurrentPlan] = useState<CurrentPlan>();
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NavigationStackProp>();
  const { usage: photosUsage } = useAppSelector((state) => state.photos);
  const { usage: storageUsage, limit } = useAppSelector((state) => state.storage);
  const { showRunOutOfSpaceModal } = useAppSelector((state) => state.layout);
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

  useEffect(() => {
    paymentService
      .getCurrentIndividualPlan()
      .then(setCurrentPlan)
      .catch(() => undefined);
  }, []);

  return (
    <Modal
      position={'bottom'}
      style={tailwind('bg-transparent')}
      coverScreen={Platform.OS === 'android'}
      isOpen={showRunOutOfSpaceModal}
      onClosed={() => {
        dispatch(layoutActions.setShowDeleteModal(false));
        dispatch(layoutActions.setShowRunOutSpaceModal(false));
      }}
      backButtonClose={true}
      backdropPressToClose={true}
      animationDuration={250}
    >
      <View style={tailwind('h-full')}>
        <TouchableWithoutFeedback
          style={tailwind('flex-grow')}
          onPress={() => {
            dispatch(layoutActions.setShowRunOutSpaceModal(false));
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
              {strings.modals.out_of_space_modal.title}
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
                {strings.modals.run_out_of_storage.advice}
              </Text>
            </View>

            <TouchableHighlight
              underlayColor={getColor('blue-70')}
              style={tailwind('bg-blue-60 rounded-lg py-2 mx-6 items-center justify-center')}
              onPress={() => {
                dispatch(layoutActions.setShowRunOutSpaceModal(false));
                navigation.push(AppScreenKey.Billing);
              }}
            >
              <Text style={[tailwind('text-lg text-white'), globalStyle.fontWeight.medium]}>
                {strings.components.buttons.upgradeNow}
              </Text>
            </TouchableHighlight>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default RunOutOfStorageModal;
