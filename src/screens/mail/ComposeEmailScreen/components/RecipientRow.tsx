import { ReactNode } from 'react';
import { TextInput, TextInputKeyPressEvent, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import useGetColor from '../../../../hooks/useColor';
import { isEntryTerminator, parseRecipients } from '../../../../services/mail/parseRecipients';
import { ComposeFieldRow } from './ComposeFieldRow';
import { composeFieldTextStyle } from './composeFieldStyles';
import { RecipientChip } from './RecipientChip';

type RecipientRowProps = {
  label: string;
  recipients: string[];
  pendingText: string;
  onChangePendingText: (text: string) => void;
  onFinishEntry: (typedText: string) => void;
  onRemoveRecipient: (address: string) => void;
  renderAppend?: ReactNode;
};

/**
 * A recipient field: the addresses already added as chips, and an input for the next one. It decides
 * when an entry is finished.
 *
 * @param props.label - Text shown to the left of the field.
 * @param props.recipients - Addresses currently in the field.
 * @param props.pendingText - What is typed in the field and not yet turned into a recipient.
 * @param props.onChangePendingText - Called with the text while an entry is being typed.
 * @param props.onFinishEntry - Called with the typed text once an entry is finished.
 * @param props.onRemoveRecipient - Called with the address of a recipient taken out of the field.
 * @param props.renderAppend - Element pinned to the right end of the line.
 */
export const RecipientRow = ({
  label,
  recipients,
  pendingText,
  onChangePendingText,
  onFinishEntry,
  onRemoveRecipient,
  renderAppend,
}: RecipientRowProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  const onChangeText = (value: string) => {
    const lastCharacter = value.slice(-1);
    const wasPasted = value.length - pendingText.length > 1;
    const { emails, invalid } = parseRecipients(value);
    const isWholeEntryAnAddress = emails.length > 0 && invalid.length === 0;

    const isEntryFinished = isEntryTerminator(lastCharacter) || (lastCharacter === ' ' && isWholeEntryAnAddress);
    if (isEntryFinished || (wasPasted && isWholeEntryAnAddress)) {
      onFinishEntry(value);
      return;
    }
    onChangePendingText(value);
  };

  const onKeyPress = ({ nativeEvent }: TextInputKeyPressEvent) => {
    if (nativeEvent.key === 'Backspace' && pendingText.length === 0 && recipients.length > 0) {
      onRemoveRecipient(recipients[recipients.length - 1]);
    }
  };

  return (
    <ComposeFieldRow label={label} renderAppend={renderAppend}>
      <View style={tailwind('flex-row flex-wrap items-center py-1.5')}>
        {recipients.map((recipient) => (
          <RecipientChip key={recipient} address={recipient} onRemove={() => onRemoveRecipient(recipient)} />
        ))}
        <TextInput
          accessibilityLabel={label}
          value={pendingText}
          onChangeText={onChangeText}
          onKeyPress={onKeyPress}
          onBlur={() => onFinishEntry(pendingText)}
          onSubmitEditing={() => onFinishEntry(pendingText)}
          submitBehavior="submit"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          returnKeyType="next"
          style={[tailwind('flex-1'), composeFieldTextStyle, { minWidth: 140, color: getColor('text-gray-100') }]}
        />
      </View>
    </ComposeFieldRow>
  );
};
