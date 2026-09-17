import { ReactNode, useState } from 'react';
import { NativeSyntheticEvent, TextInput, TextInputKeyPressEventData, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import useGetColor from '../../../../hooks/useColor';
import { isEntryTerminator, parseRecipients } from '../../../../services/mail/parseRecipients';
import { ComposeFieldRow } from './ComposeFieldRow';
import { composeFieldTextStyle } from './composeFieldStyles';
import { RecipientChip } from './RecipientChip';

type RecipientRowProps = {
  label: string;
  recipients: string[];
  onChangeRecipients: (recipients: string[]) => void;
  renderAppend?: ReactNode;
};

/**
 * A recipient field: the addresses already added as chips, and an input for the next one. Text
 * that cannot be read as an address stays in the input instead of becoming a chip.
 *
 * @param props.label - Text shown to the left of the field.
 * @param props.recipients - Addresses currently in the field.
 * @param props.onChangeRecipients - Called with the new list whenever it changes.
 * @param props.renderAppend - Element pinned to the right end of the line.
 */
export const RecipientRow = ({
  label,
  recipients,
  onChangeRecipients,
  renderAppend,
}: RecipientRowProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const [inputValue, setInputValue] = useState('');

  const addRecipients = (value: string) => {
    const { emails, invalid } = parseRecipients(value);
    const alreadyAdded = new Set(recipients.map((recipient) => recipient.toLowerCase()));
    const newRecipients = emails.filter((email) => !alreadyAdded.has(email.toLowerCase()));

    if (newRecipients.length > 0) {
      onChangeRecipients([...recipients, ...newRecipients]);
    }
    setInputValue(invalid.join(', '));
  };

  const onChangeText = (value: string) => {
    const lastCharacter = value.slice(-1);
    const wasPasted = value.length - inputValue.length > 1;
    const { emails, invalid } = parseRecipients(value);
    const isWholeEntryAnAddress = emails.length > 0 && invalid.length === 0;

    const isEntryFinished = isEntryTerminator(lastCharacter) || (lastCharacter === ' ' && isWholeEntryAnAddress);
    if (isEntryFinished || (wasPasted && isWholeEntryAnAddress)) {
      addRecipients(value);
      return;
    }
    setInputValue(value);
  };

  const onKeyPress = ({ nativeEvent }: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (nativeEvent.key === 'Backspace' && inputValue.length === 0 && recipients.length > 0) {
      onChangeRecipients(recipients.slice(0, -1));
    }
  };

  const onRemoveRecipient = (address: string) => {
    onChangeRecipients(recipients.filter((recipient) => recipient !== address));
  };

  return (
    <ComposeFieldRow label={label} renderAppend={renderAppend}>
      <View style={tailwind('flex-row flex-wrap items-center py-1.5')}>
        {recipients.map((recipient) => (
          <RecipientChip key={recipient} address={recipient} onRemove={() => onRemoveRecipient(recipient)} />
        ))}
        <TextInput
          accessibilityLabel={label}
          value={inputValue}
          onChangeText={onChangeText}
          onKeyPress={onKeyPress}
          onBlur={() => addRecipients(inputValue)}
          onSubmitEditing={() => addRecipients(inputValue)}
          blurOnSubmit={false}
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
