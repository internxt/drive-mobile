import { MailDrawerParamList, MailStackParamList } from '@internxt-mobile/types/navigation';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useFocusEffect } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { EnvelopeIcon } from 'phosphor-react-native';
import { useCallback } from 'react';
import { EmailDetailScreen } from 'src/screens/mail/EmailDetailScreen';

import strings from '../../assets/lang/strings';
import AppScreen from '../components/AppScreen';
import LockedFeatureOverlay from '../components/LockedFeatureOverlay';
import useGetColor from '../hooks/useColor';
import { useLanguage } from '../hooks/useLanguage';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { paymentsSelectors, paymentsThunks } from '../store/slices/payments';
import MailboxListScreen from '../screens/mail/MailboxListScreen';
import { MailSearchScreen } from '../screens/mail/MailSearchScreen';
import { MAILBOX_ORDER, MailboxId } from '../types/mail';
import MailDrawerContent from './MailDrawerContent';

const MailStack = createNativeStackNavigator<MailStackParamList>();
const MailDrawer = createDrawerNavigator<MailDrawerParamList>();

const MailboxDrawerNavigator = () => {
  const getColor = useGetColor();

  return (
    <MailDrawer.Navigator
      initialRouteName={MailboxId.Inbox}
      drawerContent={(props) => <MailDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: { width: '78%', backgroundColor: getColor('bg-surface') },
      }}
    >
      {MAILBOX_ORDER.map((mailboxId) => (
        <MailDrawer.Screen key={mailboxId} name={mailboxId} component={MailboxListScreen} />
      ))}
    </MailDrawer.Navigator>
  );
};

export const MailNavigator = () => {
  const dispatch = useAppDispatch();
  const hasMailAccess = useAppSelector(paymentsSelectors.hasMailAccess);
  useLanguage();

  useFocusEffect(
    useCallback(() => {
      dispatch(paymentsThunks.loadMailAccessThunk());
    }, [dispatch]),
  );

  if (!hasMailAccess) {
    return (
      <AppScreen safeAreaTop style={{ flex: 1 }}>
        <LockedFeatureOverlay icon={EnvelopeIcon} texts={strings.screens.mail.mailLocked} />
      </AppScreen>
    );
  }

  return (
    <MailStack.Navigator screenOptions={{ headerShown: false }}>
      <MailStack.Screen name="MailboxDrawer" component={MailboxDrawerNavigator} options={{ animation: 'default' }} />
      <MailStack.Screen name="EmailDetail" component={EmailDetailScreen} />
      <MailStack.Screen name="MailSearch" component={MailSearchScreen} />
    </MailStack.Navigator>
  );
};
