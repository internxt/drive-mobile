import {
  ArrowCounterClockwiseIcon,
  EnvelopeIcon,
  type Icon,
  ShieldCheckIcon,
  TrashIcon,
  WarningIcon,
} from 'phosphor-react-native';
import { useState } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import strings from '../../../../assets/lang/strings';
import AppText from '../../../components/AppText';
import useGetColor from '../../../hooks/useColor';
import { MailboxId } from '../../../types/mail';

type ThreadActionKey = 'markUnread' | 'spam' | 'notSpam' | 'trash' | 'restore' | 'deletePermanently';

type ThreadAction = {
  label: string;
  icon: Icon;
  onPress: () => void;
};

const ACTIONS_BY_MAILBOX: Record<MailboxId, ThreadActionKey[]> = {
  [MailboxId.Inbox]: ['markUnread', 'spam', 'trash'],
  [MailboxId.Sent]: ['trash'],
  [MailboxId.Drafts]: ['trash'],
  [MailboxId.Spam]: ['markUnread', 'notSpam', 'trash'],
  [MailboxId.Trash]: ['restore', 'deletePermanently'],
};

export const ThreadActions = ({
  mailboxId,
  isDisabled,
  onMarkUnread,
  onMove,
  onRestore,
  onDeletePermanently,
}: {
  mailboxId: MailboxId;
  isDisabled: boolean;
  onMarkUnread: () => void;
  onMove: (toMailboxId: MailboxId) => void;
  onRestore: () => void;
  onDeletePermanently: () => void;
}) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const { actions } = strings.screens.email_detail;
  const [pressedActionKey, setPressedActionKey] = useState<ThreadActionKey | null>(null);

  const threadActions: Record<ThreadActionKey, ThreadAction> = {
    markUnread: { label: actions.markUnread, icon: EnvelopeIcon, onPress: onMarkUnread },
    spam: { label: actions.spam, icon: WarningIcon, onPress: () => onMove(MailboxId.Spam) },
    notSpam: { label: actions.notSpam, icon: ShieldCheckIcon, onPress: () => onMove(MailboxId.Inbox) },
    trash: { label: actions.trash, icon: TrashIcon, onPress: () => onMove(MailboxId.Trash) },
    restore: { label: actions.restore, icon: ArrowCounterClockwiseIcon, onPress: onRestore },
    deletePermanently: { label: actions.deletePermanently, icon: TrashIcon, onPress: onDeletePermanently },
  };

  return (
    <View
      style={[
        tailwind('flex-row items-center justify-around py-2'),
        { borderBottomWidth: 1, borderBottomColor: getColor('border-gray-5') },
      ]}
    >
      {ACTIONS_BY_MAILBOX[mailboxId].map((actionKey) => {
        const { label, icon: ActionIcon, onPress } = threadActions[actionKey];
        const isRunningAction = isDisabled && pressedActionKey === actionKey;
        return (
          <TouchableOpacity
            key={actionKey}
            onPress={() => {
              setPressedActionKey(actionKey);
              onPress();
            }}
            disabled={isDisabled}
            style={[tailwind('items-center px-4 py-2'), isDisabled && !isRunningAction ? { opacity: 0.4 } : undefined]}
          >
            {isRunningAction ? (
              <ActivityIndicator color={getColor('text-gray-80')} style={{ height: 22 }} />
            ) : (
              <ActionIcon color={getColor('text-gray-80')} size={22} />
            )}
            <AppText numberOfLines={1} style={[tailwind('text-xs mt-1'), { color: getColor('text-gray-80') }]}>
              {label}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
