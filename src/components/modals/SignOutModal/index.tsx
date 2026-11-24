import { useRef, useState } from 'react';
import { View } from 'react-native';

import strings from '../../../../assets/lang/strings';
import appService from '../../../services/AppService';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { authSelectors, authThunks } from '../../../store/slices/auth';
import { uiActions } from '../../../store/slices/ui';
import AppButton from '../../AppButton';
import AppText from '../../AppText';
import LoadingSpinner from '../../LoadingSpinner';
import UserProfilePicture from '../../UserProfilePicture';
import CenterModal from '../CenterModal';

function SignOutModal(): JSX.Element {
  const dispatch = useAppDispatch();
  const userFullName = useAppSelector(authSelectors.userFullName);
  const user = useAppSelector((state) => state.auth.user);
  const { isSignOutModalOpen } = useAppSelector((state) => state.ui);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const isSigningOutRef = useRef(false);

  const onClosed = () => {
    dispatch(uiActions.setIsSignOutModalOpen(false));
  };
  const onCancelButtonPressed = () => {
    onClosed();
  };
  const onSignOutButtonPressed = async () => {
    if (isSigningOutRef.current) {
      return;
    }
    isSigningOutRef.current = true;
    setIsSigningOut(true);
    await dispatch(authThunks.signOutThunk({ reason: 'manual' }));
    isSigningOutRef.current = false;
    setIsSigningOut(false);
    onClosed();
  };

  return (
    <CenterModal
      isOpen={isSignOutModalOpen || isSigningOut}
      onClosed={onClosed}
      backdropPressToClose={false}
      backButtonClose={!isSigningOut}
    >
      {isSigningOut ? (
        <View className="w-full px-6 py-8 items-center">
          <View style={{ width: 48, height: 48 }}>
            <LoadingSpinner size={40} />
          </View>
          <AppText className="text-gray-80 text-center text-base mt-5" medium>
            {appService.isPhotosEnabled
              ? strings.modals.SignOutModal.signingOut
              : strings.modals.SignOutModal.signingOutGeneric}
          </AppText>
        </View>
      ) : (
        <View className="w-full px-3 pt-7 pb-3">
          <AppText className="mx-4 text-center text-xl" numberOfLines={1} semibold>
            {strings.modals.SignOutModal.title}
          </AppText>

          <View className="items-center my-6">
            <UserProfilePicture uri={user?.avatar} size={80} />
            <AppText className="text-lg text-gray-80 mt-2" medium>
              {userFullName}
            </AppText>
            <AppText className="text-gray-40">{user?.email}</AppText>
          </View>

          <View className="flex-row">
            <AppButton
              className="flex-1 mr-2"
              title={strings.buttons.cancel}
              type="cancel"
              onPress={onCancelButtonPressed}
            />
            <AppButton
              className="flex-1"
              title={strings.buttons.signOut}
              type="delete"
              onPress={onSignOutButtonPressed}
            />
          </View>
        </View>
      )}
    </CenterModal>
  );
}

export default SignOutModal;
