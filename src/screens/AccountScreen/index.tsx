import { useAppDispatch } from '../../store/hooks';
import { uiActions } from '../../store/slices/ui';

function AccountScreen(): JSX.Element {
  const dispatch = useAppDispatch();
  const onLogoutPressed = () => {
    dispatch(uiActions.setIsSignOutModalOpen(true));
  };
  const onBillingPressed = () => undefined;
  const onChangePasswordPressed = () => undefined;

  return <></>;
}

export default AccountScreen;
