import { TouchableOpacity } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import { addEmailEntries } from '@internxt-mobile/services/mail/mailSearch';
import strings from '../../../../../assets/lang/strings';
import AppText from '../../../../components/AppText';
import useGetColor from '../../../../hooks/useColor';
import { RecipientRow } from '../../components/RecipientRow';

export const EmailFilterPanel = ({
  label,
  emails,
  pendingText,
  onChange,
  onDone,
}: {
  label: string;
  emails: string[];
  pendingText: string;
  onChange: (changes: { emails?: string[]; pendingText?: string }) => void;
  onDone: () => void;
}): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  return (
    <RecipientRow
      label={label}
      recipients={emails}
      pendingText={pendingText}
      autoFocus
      hasCompactLabel
      onChangePendingText={(typedText) => onChange({ pendingText: typedText })}
      onFinishEntry={(typedText) => onChange({ emails: addEmailEntries(emails, typedText), pendingText: '' })}
      onRemoveRecipient={(removedEmail) => onChange({ emails: emails.filter((email) => email !== removedEmail) })}
      renderAppend={
        <TouchableOpacity accessibilityRole="button" onPress={onDone} style={tailwind('px-3 py-1')}>
          <AppText medium style={{ color: getColor('text-primary') }}>
            {strings.screens.mail.search.filters.done}
          </AppText>
        </TouchableOpacity>
      }
    />
  );
};
