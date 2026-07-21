import {
  EnvelopeIcon,
  NotePencilIcon,
  PaperPlaneTiltIcon,
  TrashIcon,
  TrayIcon,
  WarningIcon,
} from 'phosphor-react-native';
import { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import AppScreen from '../../../components/AppScreen';
import AppScreenTitle from '../../../components/AppScreenTitle';
import AppText from '../../../components/AppText';
import useGetColor from '../../../hooks/useColor';
import { useLanguage } from '../../../hooks/useLanguage';
import strings from '../../../../assets/lang/strings';

enum MailboxId {
  Inbox = 'inbox',
  Drafts = 'drafts',
  Sent = 'sent',
  Spam = 'spam',
  Trash = 'trash',
}

const MailboxListScreen = (): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  useLanguage();
  const [selectedMailboxId, setSelectedMailboxId] = useState<MailboxId>(MailboxId.Inbox);

  const mailboxes = [
    { id: MailboxId.Inbox, label: strings.screens.mail.mailboxes.inbox, Icon: TrayIcon },
    { id: MailboxId.Sent, label: strings.screens.mail.mailboxes.sent, Icon: PaperPlaneTiltIcon },
    { id: MailboxId.Drafts, label: strings.screens.mail.mailboxes.drafts, Icon: NotePencilIcon },
    { id: MailboxId.Spam, label: strings.screens.mail.mailboxes.spam, Icon: WarningIcon },
    { id: MailboxId.Trash, label: strings.screens.mail.mailboxes.trash, Icon: TrashIcon },
  ];

  return (
    <AppScreen safeAreaTop style={tailwind('flex-1 flex-grow')}>
      <AppScreenTitle text={strings.screens.mail.title} showBackButton={false} />

      <View style={tailwind('px-4')}>
        {mailboxes.map((mailbox) => {
          const isSelected = mailbox.id === selectedMailboxId;
          return (
            <TouchableOpacity
              key={mailbox.id}
              style={[
                tailwind('flex-row items-center py-3.5'),
                { borderBottomWidth: 1, borderBottomColor: getColor('border-gray-5') },
              ]}
              onPress={() => setSelectedMailboxId(mailbox.id)}
            >
              <mailbox.Icon
                color={isSelected ? getColor('text-primary') : getColor('text-gray-80')}
                weight={isSelected ? 'fill' : undefined}
                size={22}
              />
              <AppText style={[tailwind('ml-3 text-lg'), isSelected ? { color: getColor('text-primary') } : undefined]}>
                {mailbox.label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={tailwind('flex-1 items-center justify-center')}>
        <EnvelopeIcon color={getColor('text-gray-30')} size={48} />
        <AppText style={[tailwind('mt-3 text-center text-gray-50'), { paddingHorizontal: 32 }]}>
          {strings.screens.mail.empty[selectedMailboxId]}
        </AppText>
      </View>
    </AppScreen>
  );
};

export default MailboxListScreen;
