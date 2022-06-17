import React from 'react';
import { View } from 'react-native';

import strings from '../../../../assets/lang/strings';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { uiActions } from '../../../store/slices/ui';
import CenterModal from '../CenterModal';
import AppButton from '../../AppButton';
import AppText from '../../AppText';
import { authSelectors, authThunks } from '../../../store/slices/auth';
import { useNavigation } from '@react-navigation/native';
import { RootScreenNavigationProp } from '../../../types/navigation';
import { useTailwind } from 'tailwind-rn';
import UserProfilePicture from '../../UserProfilePicture';

function SignOutModal(): JSX.Element {
  const tailwind = useTailwind();
  const dispatch = useAppDispatch();
  const userFullName = useAppSelector(authSelectors.userFullName);
  const user = useAppSelector((state) => state.auth.user);
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
        <AppText style={tailwind('mx-4 text-center text-xl text-neutral-500')} numberOfLines={1} semibold>
          {strings.modals.SignOutModal.title}
        </AppText>

        <View style={tailwind('items-center my-6')}>
          <UserProfilePicture uri={user?.avatar} size={80} />
          <AppText style={tailwind('text-lg text-gray-80 mt-2')} medium>
            {userFullName}
          </AppText>
          <AppText style={tailwind('text-gray-40')}>{user?.email}</AppText>
        </View>

        <View style={tailwind('flex-row')}>
          <AppButton
            style={tailwind('flex-1 mr-2')}
            title={strings.buttons.cancel}
            type="cancel"
            onPress={onCancelButtonPressed}
          />
          <AppButton
            style={tailwind('flex-1')}
            title={strings.buttons.signOut}
            type="delete"
            onPress={onSignOutButtonPressed}
          />
        </View>
      </View>
    </CenterModal>
  );
}

export default SignOutModal;
