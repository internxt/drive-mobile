import { useRef, useState } from 'react';
import { View } from 'react-native';

import { useTailwind } from 'tailwind-rn';
import strings from '../../../../assets/lang/strings';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { authSelectors, authThunks } from '../../../store/slices/auth';
import { uiActions } from '../../../store/slices/ui';
import AppButton from '../../AppButton';
import AppText from '../../AppText';
import LoadingSpinner from '../../LoadingSpinner';
import UserProfilePicture from '../../UserProfilePicture';
import CenterModal from '../CenterModal';

interface SignOutModalProps {
  readonly onSignedOut: () => void;
}

function SignOutModal({ onSignedOut }: SignOutModalProps): JSX.Element {
  const tailwind = useTailwind();
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
    onSignedOut();
    onClosed();
  };

  return (
    <CenterModal
      // signOutThunk resets isSignOutModalOpen early — the local flag keeps the loader open until done.
      isOpen={isSignOutModalOpen || isSigningOut}
      onClosed={onClosed}
      backdropPressToClose={false}
      backButtonClose={!isSigningOut}
    >
      {isSigningOut ? (
        <View style={tailwind('w-full px-6 py-8 items-center')}>
          {/* LoadingSpinner sizes itself via flex-1 and collapses without a fixed-height container */}
          <View style={{ width: 48, height: 48 }}>
            <LoadingSpinner size={40} />
          </View>
          <AppText style={tailwind('text-gray-80 text-center text-base mt-5')} medium>
            {strings.modals.SignOutModal.signingOut}
          </AppText>
        </View>
      ) : (
        <View style={tailwind('w-full px-3 pt-7 pb-3')}>
          <AppText style={tailwind('mx-4 text-center text-xl')} numberOfLines={1} semibold>
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
      )}
    </CenterModal>
  );
}

export default SignOutModal;
