import {
  ArrowCounterClockwiseIcon,
  EnvelopeIcon,
  type Icon,
  ShieldCheckIcon,
  TrashIcon,
  WarningIcon,
} from 'phosphor-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import strings from '../../../../assets/lang/strings';
import useGetColor from '../../../hooks/useColor';
import { MailboxId } from '../../../types/mail';

const ACTION_BUTTON_SIZE = 40;
const ACTION_ICON_SIZE = 22;
const DISABLED_OPACITY = 0.4;

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
    <View style={tailwind('flex-row items-center')}>
      {ACTIONS_BY_MAILBOX[mailboxId].map((actionKey) => {
        const { label, icon: ActionIcon, onPress } = threadActions[actionKey];
        const isRunningAction = isDisabled && pressedActionKey === actionKey;
        return (
          <Pressable
            key={actionKey}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => {
              setPressedActionKey(actionKey);
              onPress();
            }}
            disabled={isDisabled}
            style={({ pressed }) => [
              tailwind('items-center justify-center rounded-full'),
              {
                width: ACTION_BUTTON_SIZE,
                height: ACTION_BUTTON_SIZE,
                backgroundColor: pressed ? getColor('bg-gray-5') : undefined,
                opacity: isDisabled && !isRunningAction ? DISABLED_OPACITY : 1,
              },
            ]}
          >
            {isRunningAction ? (
              <ActivityIndicator color={getColor('text-gray-80')} />
            ) : (
              <ActionIcon color={getColor('text-gray-80')} size={ACTION_ICON_SIZE} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
};
