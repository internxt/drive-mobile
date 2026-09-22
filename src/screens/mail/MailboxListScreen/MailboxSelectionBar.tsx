import {
  ArrowCounterClockwiseIcon,
  EnvelopeIcon,
  EnvelopeOpenIcon,
  type Icon,
  ShieldCheckIcon,
  TrashIcon,
  WarningIcon,
} from 'phosphor-react-native';
import { useState } from 'react';
import { ActivityIndicator, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useTailwind } from 'tailwind-rn';

import strings from '../../../../assets/lang/strings';
import useGetColor from '../../../hooks/useColor';
import { MailboxId } from '../../../types/mail';

type SelectionActionKey = 'toggleRead' | 'spam' | 'notSpam' | 'trash' | 'restore' | 'deletePermanently';

type SelectionAction = {
  label: string;
  icon: Icon;
  onPress: () => void;
};

const ICON_SIZE = 24;
const BAR_BOTTOM_OFFSET = 16;
const BAR_LEFT_OFFSET = 12;
const BAR_BORDER_WIDTH = 1;
const BAR_SPRING_DAMPING = 18;
const BAR_EXIT_DURATION = 150;
const BAR_SHADOW = {
  shadowOpacity: 0.12,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 4 },
  elevation: 8,
};

const SELECTION_ACTIONS_BY_MAILBOX: Record<MailboxId, SelectionActionKey[]> = {
  [MailboxId.Inbox]: ['toggleRead', 'spam', 'trash'],
  [MailboxId.Sent]: ['trash'],
  [MailboxId.Drafts]: ['trash'],
  [MailboxId.Spam]: ['toggleRead', 'notSpam', 'trash'],
  [MailboxId.Trash]: ['restore', 'deletePermanently'],
};

export const MailboxSelectionBar = ({
  mailboxId,
  isDisabled,
  areAllSelectedRead,
  onMarkRead,
  onMarkUnread,
  onMove,
  onRestore,
  onDeletePermanently,
}: {
  mailboxId: MailboxId;
  isDisabled: boolean;
  areAllSelectedRead: boolean;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onMove: (toMailboxId: MailboxId) => void;
  onRestore: () => void;
  onDeletePermanently: () => void;
}) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const { actions } = strings.screens.email_detail;
  const [pressedActionKey, setPressedActionKey] = useState<SelectionActionKey | null>(null);

  const selectionActions: Record<SelectionActionKey, SelectionAction> = {
    toggleRead: areAllSelectedRead
      ? { label: actions.markUnread, icon: EnvelopeIcon, onPress: onMarkUnread }
      : { label: actions.markRead, icon: EnvelopeOpenIcon, onPress: onMarkRead },
    spam: { label: actions.spam, icon: WarningIcon, onPress: () => onMove(MailboxId.Spam) },
    notSpam: { label: actions.notSpam, icon: ShieldCheckIcon, onPress: () => onMove(MailboxId.Inbox) },
    trash: { label: actions.trash, icon: TrashIcon, onPress: () => onMove(MailboxId.Trash) },
    restore: { label: actions.restore, icon: ArrowCounterClockwiseIcon, onPress: onRestore },
    deletePermanently: { label: actions.deletePermanently, icon: TrashIcon, onPress: onDeletePermanently },
  };

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(BAR_SPRING_DAMPING)}
      exiting={FadeOutDown.duration(BAR_EXIT_DURATION)}
      style={[
        tailwind('absolute flex-row items-center rounded-full px-2'),
        {
          left: BAR_LEFT_OFFSET,
          bottom: BAR_BOTTOM_OFFSET,
          backgroundColor: getColor('bg-surface-90'),
          borderWidth: BAR_BORDER_WIDTH,
          borderColor: getColor('border-gray-10'),
          shadowColor: getColor('text-gray-100'),
          ...BAR_SHADOW,
        },
      ]}
    >
      {SELECTION_ACTIONS_BY_MAILBOX[mailboxId].map((actionKey) => {
        const { label, icon: ActionIcon, onPress } = selectionActions[actionKey];
        const isRunning = isDisabled && pressedActionKey === actionKey;
        return (
          <TouchableOpacity
            key={actionKey}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => {
              setPressedActionKey(actionKey);
              onPress();
            }}
            disabled={isDisabled}
            style={[tailwind('px-4 py-3'), isDisabled && !isRunning ? tailwind('opacity-40') : undefined]}
          >
            {isRunning ? (
              <ActivityIndicator color={getColor('text-gray-100')} style={{ width: ICON_SIZE, height: ICON_SIZE }} />
            ) : (
              <ActionIcon color={getColor('text-gray-100')} size={ICON_SIZE} />
            )}
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
};
