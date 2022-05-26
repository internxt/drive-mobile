import React from 'react';
import { View } from 'react-native';

import { tailwind } from '../../../helpers/designSystem';
import strings from '../../../../assets/lang/strings';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { uiActions } from '../../../store/slices/ui';
import CenterModal from '../CenterModal';
import AppButton from '../../AppButton';
import AppText from '../../AppText';
import { authThunks } from '../../../store/slices/auth';
import { useNavigation } from '@react-navigation/native';
import { RootScreenNavigationProp } from '../../../types/navigation';

function SignOutModal(): JSX.Element {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<RootScreenNavigationProp<'TabExplorer'>>();
  const { isSignOutModalOpen } = useAppSelector((state) => state.ui);
  const onClosed = () => {
    dispatch(uiActions.setIsSignOutModalOpen(false));
  };
  const onCancelButtonPressed = () => {
    onClosed();
  };
  const onSignOutButtonPressed = () => {
    dispatch(authThunks.signOutThunk());
    navigation.replace('SignIn');
    onClosed();
  };

  return (
    <CenterModal isOpen={isSignOutModalOpen} onClosed={onClosed} backdropPressToClose={false}>
      <View style={tailwind('w-full px-3 pt-7 pb-3')}>
        <AppText style={tailwind('mx-4 mb-4 text-center text-xl text-neutral-500')} numberOfLines={1} semibold>
          {strings.modals.SignOutModal.title}
        </AppText>

        <AppText style={tailwind('mb-7 text-neutral-100 text-center')}>{strings.modals.SignOutModal.message}</AppText>

        <View style={tailwind('flex-row')}>
          <AppButton
            style={tailwind('flex-1 mr-2')}
            title={strings.components.buttons.cancel}
            type="cancel"
            onPress={onCancelButtonPressed}
          />
          <AppButton
            style={tailwind('flex-1')}
            title={strings.components.buttons.signOut}
            type="accept"
            onPress={onSignOutButtonPressed}
          />
        </View>
      </View>
    </CenterModal>
  );
}

export default SignOutModal;
