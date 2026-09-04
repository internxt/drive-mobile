import { MailDrawerParamList, MailStackParamList } from '@internxt-mobile/types/navigation';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { EmailDetailScreen } from 'src/screens/mail/EmailDetailScreen';

import { MailContextProvider } from '../contexts/Mail/Mail.context';
import MailboxListScreen from '../screens/mail/MailboxListScreen';
import { MAILBOX_ORDER, MailboxId } from '../types/mail';
import MailDrawerContent from './MailDrawerContent';

const MailStack = createNativeStackNavigator<MailStackParamList>();
const MailDrawer = createDrawerNavigator<MailDrawerParamList>();

const MailboxDrawerNavigator = () => {
  return (
    <MailDrawer.Navigator
      initialRouteName={MailboxId.Inbox}
      drawerContent={(props) => <MailDrawerContent {...props} />}
      screenOptions={{ headerShown: false, drawerType: 'front', drawerStyle: { width: '78%' } }}
    >
      {MAILBOX_ORDER.map((mailboxId) => (
        <MailDrawer.Screen key={mailboxId} name={mailboxId} component={MailboxListScreen} />
      ))}
    </MailDrawer.Navigator>
  );
};

export const MailNavigator = () => {
  return (
    <MailContextProvider>
      <MailStack.Navigator screenOptions={{ headerShown: false }}>
        <MailStack.Screen name="MailboxDrawer" component={MailboxDrawerNavigator} options={{ animation: 'default' }} />
        <MailStack.Screen name="EmailDetail" component={EmailDetailScreen} />
      </MailStack.Navigator>
    </MailContextProvider>
  );
};
