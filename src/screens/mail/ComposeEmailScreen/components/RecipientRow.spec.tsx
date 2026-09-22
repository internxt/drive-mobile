import { fireEvent, render } from '@testing-library/react-native';
import { RecipientRow } from './RecipientRow';

jest.mock('tailwind-rn', () => ({ useTailwind: () => () => ({}) }));

jest.mock('../../../../hooks/useColor', () => ({
  __esModule: true,
  default: () => () => '#000000',
}));

const renderRow = (recipients: string[] = []) => {
  const onChangeRecipients = jest.fn();
  const view = render(<RecipientRow label="To" recipients={recipients} onChangeRecipients={onChangeRecipients} />);

  return { ...view, onChangeRecipients, input: view.getByLabelText('To') };
};

describe('Typing recipients into a field', () => {
  test('when an address is finished with a comma, then it becomes a recipient and leaves the field empty', () => {
    const { input, onChangeRecipients } = renderRow();

    fireEvent.changeText(input, 'ada@inxt.me,');

    expect(onChangeRecipients).toHaveBeenCalledWith(['ada@inxt.me']);
    expect(input.props.value).toBe('');
  });

  test('when a finished address is followed by a space, then it becomes a recipient', () => {
    const { input, onChangeRecipients } = renderRow();

    fireEvent.changeText(input, 'ada@inxt.me ');

    expect(onChangeRecipients).toHaveBeenCalledWith(['ada@inxt.me']);
    expect(input.props.value).toBe('');
  });

  test('when a name with spaces is being typed, then the spaces do not turn it into a recipient', () => {
    const { input, onChangeRecipients } = renderRow();

    fireEvent.changeText(input, 'Ada Lovelace ');

    expect(onChangeRecipients).not.toHaveBeenCalled();
    expect(input.props.value).toBe('Ada Lovelace ');
  });

  test('when the return key is pressed with an address in the field, then it becomes a recipient', () => {
    const { input, onChangeRecipients } = renderRow();

    fireEvent.changeText(input, 'ada@inxt.me');
    fireEvent(input, 'submitEditing');

    expect(onChangeRecipients).toHaveBeenCalledWith(['ada@inxt.me']);
  });

  test('when an address is still being typed, then nothing is added yet', () => {
    const { input, onChangeRecipients } = renderRow();

    fireEvent.changeText(input, 'ada@inxt');

    expect(onChangeRecipients).not.toHaveBeenCalled();
  });

  test('when the field loses focus with an address in it, then the address is added', () => {
    const { input, onChangeRecipients } = renderRow();

    fireEvent.changeText(input, 'ada@inxt.me');
    fireEvent(input, 'blur');

    expect(onChangeRecipients).toHaveBeenCalledWith(['ada@inxt.me']);
  });

  test('when what was typed cannot be read as an address, then it stays in the field instead of becoming a recipient', () => {
    const { input, onChangeRecipients } = renderRow();

    fireEvent.changeText(input, 'not an address,');

    expect(onChangeRecipients).not.toHaveBeenCalled();
    expect(input.props.value).toBe('not an address');
  });

  test('when a list of addresses is pasted, then every address in it becomes its own recipient', () => {
    const { input, onChangeRecipients } = renderRow();

    fireEvent.changeText(input, 'ada@inxt.me, grace@inxt.me');

    expect(onChangeRecipients).toHaveBeenCalledWith(['ada@inxt.me', 'grace@inxt.me']);
  });

  test('when an address already in the field is typed again, then it is not added twice', () => {
    const { input, onChangeRecipients } = renderRow(['ada@inxt.me']);

    fireEvent.changeText(input, 'ada@inxt.me,');

    expect(onChangeRecipients).not.toHaveBeenCalled();
  });

  test('when backspace is pressed on an empty field, then the last recipient is removed', () => {
    const { input, onChangeRecipients } = renderRow(['ada@inxt.me', 'grace@inxt.me']);

    fireEvent(input, 'keyPress', { nativeEvent: { key: 'Backspace' } });

    expect(onChangeRecipients).toHaveBeenCalledWith(['ada@inxt.me']);
  });

  test('when backspace is pressed while there is text in the field, then no recipient is removed', () => {
    const { input, onChangeRecipients, getByLabelText } = renderRow(['ada@inxt.me']);

    fireEvent.changeText(input, 'gr');
    fireEvent(input, 'keyPress', { nativeEvent: { key: 'Backspace' } });

    expect(onChangeRecipients).not.toHaveBeenCalled();
    expect(getByLabelText('ada@inxt.me')).toBeTruthy();
  });

  test('when a pasted list mixes an address and something that is not one, then the address is added and the rest stays in the field', () => {
    const { input, onChangeRecipients } = renderRow();

    fireEvent.changeText(input, 'ada@inxt.me, not an address');
    expect(onChangeRecipients).not.toHaveBeenCalled();

    fireEvent(input, 'blur');

    expect(onChangeRecipients).toHaveBeenCalledWith(['ada@inxt.me']);
    expect(input.props.value).toBe('not an address');
  });

  test('when a recipient is removed from its chip, then it leaves the field', () => {
    const onChangeRecipients = jest.fn();
    const { getByLabelText } = render(
      <RecipientRow label="To" recipients={['ada@inxt.me', 'grace@inxt.me']} onChangeRecipients={onChangeRecipients} />,
    );

    fireEvent.press(getByLabelText('ada@inxt.me'));

    expect(onChangeRecipients).toHaveBeenCalledWith(['grace@inxt.me']);
  });
});
