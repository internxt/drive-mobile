import { act, fireEvent, render, RenderResult, waitFor } from '@testing-library/react-native';

import strings from '../../../assets/lang/strings';
import { NewFolderModal } from './NewFolderModal';

jest.mock('tailwind-rn', () => ({ useTailwind: () => () => ({}) }));

jest.mock('../theme', () => ({
  fontStyles: { semibold: {} },
  useShareColors: () => ({}),
}));

jest.mock('../../services/common', () => ({ HTTP_CONFLICT: 409 }));

const FOLDER_NAME = 'Invoices';
const NAME_TYPED_AFTERWARDS = 'Invoices 2026';

const renderNewFolderModal = (onCreate: jest.Mock) => {
  const screen = render(<NewFolderModal visible onCancel={jest.fn()} onCreate={onCreate} />);
  fireEvent.changeText(screen.getByDisplayValue(strings.screens.create_folder.defaultName), FOLDER_NAME);
  return screen;
};

const getConfirmFromKeyboardHandler = (screen: RenderResult): (() => void) =>
  screen.getByDisplayValue(FOLDER_NAME).props.onSubmitEditing;

describe('Creating a folder from the share screen', () => {
  test('when the user confirms the name twice before the dialog updates, then only one folder is created', async () => {
    const onCreate = jest.fn().mockReturnValue(new Promise(() => undefined));
    const screen = renderNewFolderModal(onCreate);
    const confirmFromKeyboard = getConfirmFromKeyboardHandler(screen);

    await act(async () => {
      confirmFromKeyboard();
      confirmFromKeyboard();
    });

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate).toHaveBeenCalledWith(FOLDER_NAME);
  });

  test('when the folder is being created, then the name can no longer be edited', async () => {
    const onCreate = jest.fn().mockReturnValue(new Promise(() => undefined));
    const screen = renderNewFolderModal(onCreate);

    fireEvent(screen.getByDisplayValue(FOLDER_NAME), 'submitEditing');
    await waitFor(() => expect(onCreate).toHaveBeenCalled());
    fireEvent.changeText(screen.getByDisplayValue(FOLDER_NAME), NAME_TYPED_AFTERWARDS);

    expect(screen.queryByDisplayValue(NAME_TYPED_AFTERWARDS)).toBeNull();
  });

  test('when creating the folder fails, then the user can try to create it again', async () => {
    const onCreate = jest
      .fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockReturnValue(new Promise(() => undefined));
    const screen = renderNewFolderModal(onCreate);

    fireEvent(screen.getByDisplayValue(FOLDER_NAME), 'submitEditing');
    await waitFor(() => expect(screen.getByText(strings.screens.ShareExtension.folderCreateError)).toBeTruthy());
    fireEvent(screen.getByDisplayValue(FOLDER_NAME), 'submitEditing');

    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(2));
  });
});
