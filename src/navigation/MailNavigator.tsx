import { EmailDetailScreen } from 'src/screens/mail/EmailDetailScreen';
import { MailStackParamList } from '@internxt-mobile/types/navigation';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MailboxListScreen from '../screens/mail/MailboxListScreen';

const MailStack = createNativeStackNavigator<MailStackParamList>();

export const MailNavigator = () => {
  return (
    <MailStack.Navigator screenOptions={{ headerShown: false }}>
      <MailStack.Screen name="MailboxList" component={MailboxListScreen} options={{ animation: 'default' }} />
      <MailStack.Screen name="EmailDetail" component={EmailDetailScreen} />
    </MailStack.Navigator>
  );
};
