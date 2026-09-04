import { DrawerContentComponentProps, DrawerContentScrollView } from '@react-navigation/drawer';
import { NotePencilIcon, PaperPlaneTiltIcon, TrashIcon, TrayIcon, WarningIcon } from 'phosphor-react-native';
import { TouchableOpacity, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import strings from '../../assets/lang/strings';
import AppText from '../components/AppText';
import { useMail } from '../contexts/Mail/Mail.context';
import useGetColor from '../hooks/useColor';
import { useLanguage } from '../hooks/useLanguage';
import { MAILBOX_ORDER, MAILBOXES_WITH_UNREAD_BADGE, MailboxId } from '../types/mail';

const MAILBOX_ICONS = {
  [MailboxId.Inbox]: TrayIcon,
  [MailboxId.Sent]: PaperPlaneTiltIcon,
  [MailboxId.Drafts]: NotePencilIcon,
  [MailboxId.Spam]: WarningIcon,
  [MailboxId.Trash]: TrashIcon,
};

const MailDrawerContent = (props: DrawerContentComponentProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const { unreadByMailbox } = useMail();
  useLanguage();

  const mailboxLabels = strings.screens.mail.mailboxes;
  const activeMailboxId = props.state.routeNames[props.state.index] as MailboxId;

  const renderMailbox = (mailboxId: MailboxId) => {
    const isActive = mailboxId === activeMailboxId;
    const Icon = MAILBOX_ICONS[mailboxId];
    const unreadCount = unreadByMailbox[mailboxId] ?? 0;
    const showUnreadBadge = MAILBOXES_WITH_UNREAD_BADGE.has(mailboxId) && unreadCount > 0;

    return (
      <TouchableOpacity
        key={mailboxId}
        accessibilityRole="button"
        accessibilityState={isActive ? { selected: true } : {}}
        style={[
          tailwind('flex-row items-center rounded-full px-4 py-3 mx-2'),
          isActive ? { backgroundColor: getColor('bg-gray-5') } : undefined,
        ]}
        onPress={() => props.navigation.navigate(mailboxId)}
      >
        <Icon
          color={isActive ? getColor('text-primary') : getColor('text-gray-80')}
          weight={isActive ? 'fill' : undefined}
          size={22}
        />
        <AppText
          numberOfLines={1}
          style={[tailwind('ml-3 flex-1 text-lg'), isActive ? { color: getColor('text-primary') } : undefined]}
        >
          {mailboxLabels[mailboxId]}
        </AppText>
        {showUnreadBadge && (
          <View
            style={[
              tailwind('ml-2 items-center justify-center rounded-full px-2'),
              { backgroundColor: getColor('text-primary'), minWidth: 22, height: 22 },
            ]}
          >
            <AppText style={[tailwind('text-xs'), { color: getColor('text-white') }]}>{unreadCount}</AppText>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <DrawerContentScrollView {...props}>
      <View style={tailwind('px-4 pb-4')}>
        <AppText medium style={[tailwind('text-2xl'), { color: getColor('text-gray-100') }]}>
          {strings.screens.mail.title}
        </AppText>
      </View>
      {MAILBOX_ORDER.map(renderMailbox)}
    </DrawerContentScrollView>
  );
};

export default MailDrawerContent;
