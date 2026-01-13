import prettysize from 'prettysize';
import { TouchableHighlight, TouchableWithoutFeedback, View } from 'react-native';
import Modal from 'react-native-modalbox';

import AppText from 'src/components/AppText';
import { useTailwind } from 'tailwind-rn';
import RunOutImage from '../../../../assets/images/modals/runout.svg';
import strings from '../../../../assets/lang/strings';
import { openUrl } from '../../../helpers/utils';
import useGetColor from '../../../hooks/useColor';
import { PRICING_URL } from '../../../services/drive/constants';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { uiActions } from '../../../store/slices/ui';
import { INFINITE_PLAN } from '../../../types';

function RunOutOfStorageModal(): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const { limit, totalUsage } = useAppSelector((state) => state.storage);

  const { showRunOutOfSpaceModal } = useAppSelector((state) => state.ui);

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
    return prettysize(totalUsage);
  };

  const onUpgradeNowButtonPressed = () => {
    dispatch(uiActions.setShowRunOutSpaceModal(false));
    openUrl(PRICING_URL);
  };

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
            <View style={tailwind('h-1 w-20 bg-gray-20 rounded-full')} />
          </View>

          <View style={tailwind('bg-white justify-center px-5 pt-3 pb-8')}>
            <AppText style={tailwind('text-center text-lg text-gray-100')} medium>
              {strings.modals.OutOfSpaceModal.title}
            </AppText>

            <View style={tailwind('items-center my-6')}>
              <View style={tailwind('items-center')}>
                <RunOutImage width={80} height={80} />
              </View>

              <AppText style={tailwind('text-sm text-gray-50 mt-3')} medium>
                {strings.screens.StorageScreen.space.used.used} {getUsageString()}{' '}
                {strings.screens.StorageScreen.space.used.of} {getLimitString()}
              </AppText>
            </View>

            <View style={tailwind('flex-grow mb-6')}>
              <AppText style={tailwind('text-sm text-center text-gray-50')}>
                {strings.modals.OutOfSpaceModal.advice}
              </AppText>
            </View>

            <TouchableHighlight
              underlayColor={getColor('text-primary-dark')}
              style={tailwind('bg-primary rounded-lg py-2 mx-6 items-center justify-center')}
              onPress={onUpgradeNowButtonPressed}
            >
              <AppText style={tailwind('text-lg text-white')} medium>
                {strings.buttons.upgradeNow}
              </AppText>
            </TouchableHighlight>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default RunOutOfStorageModal;
