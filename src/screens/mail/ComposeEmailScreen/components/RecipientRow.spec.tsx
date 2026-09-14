import { fireEvent, render } from '@testing-library/react-native';

import { useComposeRecipients } from '../hooks/useComposeRecipients';
import { RecipientRow } from './RecipientRow';

jest.mock('tailwind-rn', () => ({ useTailwind: () => () => ({}) }));

jest.mock('../../../../hooks/useColor', () => ({
  __esModule: true,
  default: () => () => '#000000',
}));

const MainRecipientsField = ({ initialRecipients }: { initialRecipients: string[] }) => {
  const { recipients, pendingText, changePendingText, addTypedRecipients, removeRecipient } = useComposeRecipients({
    to: initialRecipients,
  });

  return (
    <RecipientRow
      label="To"
      recipients={recipients.to}
      pendingText={pendingText.to}
      onChangePendingText={(typedText) => changePendingText('to', typedText)}
      onFinishEntry={(typedText) => addTypedRecipients('to', typedText)}
      onRemoveRecipient={(address) => removeRecipient('to', address)}
    />
  );
};

const renderRow = (initialRecipients: string[] = []) => {
  const view = render(<MainRecipientsField initialRecipients={initialRecipients} />);

  return { ...view, input: view.getByLabelText('To') };
};

const typeOneLetterAtATime = (input: ReturnType<typeof renderRow>['input'], text: string) => {
  for (let letterCount = 1; letterCount <= text.length; letterCount += 1) {
    fireEvent.changeText(input, text.slice(0, letterCount));
  }
};

describe('Typing recipients into a field', () => {
  test('when an address is finished with a comma, then it becomes a recipient and leaves the field empty', () => {
    const { input, queryByLabelText } = renderRow();

    fireEvent.changeText(input, 'ada@inxt.me,');

    expect(queryByLabelText('ada@inxt.me')).toBeTruthy();
    expect(input.props.value).toBe('');
  });

  test('when an address is finished with a semicolon, then it becomes a recipient', () => {
    const { input, queryByLabelText } = renderRow();

    fireEvent.changeText(input, 'ada@inxt.me;');

    expect(queryByLabelText('ada@inxt.me')).toBeTruthy();
    expect(input.props.value).toBe('');
  });

  test('when an address is finished with a line break, then it becomes a recipient', () => {
    const { input, queryByLabelText } = renderRow();

    fireEvent.changeText(input, 'ada@inxt.me\n');

    expect(queryByLabelText('ada@inxt.me')).toBeTruthy();
    expect(input.props.value).toBe('');
  });

  test('when a finished address is followed by a space, then it becomes a recipient', () => {
    const { input, queryByLabelText } = renderRow();

    fireEvent.changeText(input, 'ada@inxt.me ');

    expect(queryByLabelText('ada@inxt.me')).toBeTruthy();
    expect(input.props.value).toBe('');
  });

  test('when a name with spaces is being typed, then the spaces do not turn it into a recipient', () => {
    const { input } = renderRow();

    fireEvent.changeText(input, 'Ada Lovelace ');

    expect(input.props.value).toBe('Ada Lovelace ');
  });

  test('when the return key is pressed with an address in the field, then it becomes a recipient', () => {
    const { input, queryByLabelText } = renderRow();

    typeOneLetterAtATime(input, 'ada@inxt.me');
    expect(queryByLabelText('ada@inxt.me')).toBeNull();

    fireEvent(input, 'submitEditing');

    expect(queryByLabelText('ada@inxt.me')).toBeTruthy();
  });

  test('when an address is still being typed, then nothing is added yet', () => {
    const { input, queryByLabelText } = renderRow();

    fireEvent.changeText(input, 'ada@inxt');

    expect(queryByLabelText('ada@inxt')).toBeNull();
    expect(input.props.value).toBe('ada@inxt');
  });

  test('when the field loses focus with an address in it, then the address is added', () => {
    const { input, queryByLabelText } = renderRow();

    typeOneLetterAtATime(input, 'ada@inxt.me');
    expect(queryByLabelText('ada@inxt.me')).toBeNull();

    fireEvent(input, 'blur');

    expect(queryByLabelText('ada@inxt.me')).toBeTruthy();
  });

  test('when what was typed cannot be read as an address, then it stays in the field instead of becoming a recipient', () => {
    const { input, queryByLabelText } = renderRow();

    fireEvent.changeText(input, 'not an address,');

    expect(queryByLabelText('not an address')).toBeNull();
    expect(input.props.value).toBe('not an address');
  });

  test('when a list of addresses is pasted, then every address in it becomes its own recipient', () => {
    const { input, queryByLabelText } = renderRow();

    fireEvent.changeText(input, 'ada@inxt.me, grace@inxt.me');

    expect(queryByLabelText('ada@inxt.me')).toBeTruthy();
    expect(queryByLabelText('grace@inxt.me')).toBeTruthy();
  });

  test('when an address already in the field is typed again, then it is not added twice', () => {
    const { input, queryAllByLabelText } = renderRow(['ada@inxt.me']);

    fireEvent.changeText(input, 'ada@inxt.me,');

    expect(queryAllByLabelText('ada@inxt.me')).toHaveLength(1);
  });

  test('when backspace is pressed on an empty field, then the last recipient is removed', () => {
    const { input, queryByLabelText } = renderRow(['ada@inxt.me', 'grace@inxt.me']);

    fireEvent(input, 'keyPress', { nativeEvent: { key: 'Backspace' } });

    expect(queryByLabelText('ada@inxt.me')).toBeTruthy();
    expect(queryByLabelText('grace@inxt.me')).toBeNull();
  });

  test('when backspace is pressed while there is text in the field, then no recipient is removed', () => {
    const { input, queryByLabelText } = renderRow(['ada@inxt.me']);

    fireEvent.changeText(input, 'gr');
    fireEvent(input, 'keyPress', { nativeEvent: { key: 'Backspace' } });

    expect(queryByLabelText('ada@inxt.me')).toBeTruthy();
  });

  test('when a pasted list mixes an address and something that is not one, then the address is added and the rest stays in the field', () => {
    const { input, queryByLabelText } = renderRow();

    fireEvent.changeText(input, 'ada@inxt.me, not an address');
    expect(queryByLabelText('ada@inxt.me')).toBeNull();

    fireEvent(input, 'blur');

    expect(queryByLabelText('ada@inxt.me')).toBeTruthy();
    expect(input.props.value).toBe('not an address');
  });

  test('when the remove button of a recipient other than the first is pressed, then only that recipient leaves the field', () => {
    const { getByLabelText, queryByLabelText } = renderRow(['ada@inxt.me', 'grace@inxt.me']);

    fireEvent.press(getByLabelText('grace@inxt.me'));

    expect(queryByLabelText('grace@inxt.me')).toBeNull();
    expect(queryByLabelText('ada@inxt.me')).toBeTruthy();
  });
});
