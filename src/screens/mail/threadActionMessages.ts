import { Alert } from 'react-native';

import strings from '../../../assets/lang/strings';
import { MailboxId } from '../../types/mail';

export const getMoveFailedMessage = (toMailboxId: MailboxId): string => {
  const { email_detail } = strings.screens;
  if (toMailboxId === MailboxId.Spam) {
    return email_detail.moveToSpamFailed;
  }
  if (toMailboxId === MailboxId.Trash) {
    return email_detail.moveToTrashFailed;
  }
  return email_detail.notSpamFailed;
};

export const confirmDeletePermanently = (onConfirm: () => void) => {
  const { deleteConfirmation } = strings.screens.email_detail;
  Alert.alert(deleteConfirmation.title, deleteConfirmation.message, [
    { text: strings.buttons.cancel, style: 'cancel' },
    { text: deleteConfirmation.confirm, style: 'destructive', onPress: onConfirm },
  ]);
};
