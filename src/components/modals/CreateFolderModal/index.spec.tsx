import { act, fireEvent, render, RenderResult, waitFor } from '@testing-library/react-native';
import { Keyboard } from 'react-native';

import drive from '@internxt-mobile/services/drive';
import strings from '../../../../assets/lang/strings';
import notificationsService from '../../../services/NotificationsService';
import { CenterModalProps } from '../CenterModal';
import CreateFolderModal from './index';

jest.mock('../CenterModal', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@internxt-mobile/services/drive', () => ({
  __esModule: true,
  default: { folder: { createFolder: jest.fn() } },
}));

jest.mock('@internxt-mobile/services/drive/database', () => ({
  driveLocalDB: { saveFolderContent: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('../../../services/ErrorService', () => ({
  __esModule: true,
  default: { castError: (error: Error) => error },
}));

jest.mock('../../../services/NotificationsService', () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));

jest.mock('../../LoadingSpinner', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('tailwind-rn', () => ({ useTailwind: () => () => ({}) }));

jest.mock('../../../hooks/useColor', () => ({
  __esModule: true,
  default: () => () => '#000000',
}));

const CenterModalMock = jest.requireMock('../CenterModal').default as jest.Mock;
const createFolderMock = drive.folder.createFolder as jest.Mock;
const showNotificationMock = notificationsService.show as jest.Mock;

const FOLDER_NAME = 'Invoices';

const renderOpenCreateFolderModal = () => {
  const screen = render(
    <CreateFolderModal
      isOpen
      currentFolderUuid="parent-folder-uuid"
      onClose={jest.fn()}
      onCancel={jest.fn()}
      onFolderCreated={jest.fn()}
    />,
  );
  fireEvent.changeText(screen.getByDisplayValue(strings.screens.create_folder.defaultName), FOLDER_NAME);
  return screen;
};

const getCreateButtonPressHandler = (screen: RenderResult): (() => void) =>
  screen.UNSAFE_getByProps({ title: strings.buttons.create }).props.onPress;

const getLastCenterModalProps = (): CenterModalProps => CenterModalMock.mock.calls.at(-1)[0];

describe('Creating a folder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    CenterModalMock.mockImplementation(({ isOpen, children }: CenterModalProps) => (isOpen ? children : null));
  });

  test('when the user presses create twice before the dialog updates, then only one folder is created', async () => {
    createFolderMock.mockReturnValue(new Promise(() => undefined));
    const screen = renderOpenCreateFolderModal();
    const pressCreateButton = getCreateButtonPressHandler(screen);

    act(() => {
      pressCreateButton();
      pressCreateButton();
    });

    await waitFor(() => expect(createFolderMock).toHaveBeenCalledWith('parent-folder-uuid', FOLDER_NAME));
    expect(createFolderMock).toHaveBeenCalledTimes(1);
  });

  test('when the user presses create, then the keyboard closes', () => {
    createFolderMock.mockReturnValue(new Promise(() => undefined));
    const dismissKeyboardSpy = jest.spyOn(Keyboard, 'dismiss');
    const screen = renderOpenCreateFolderModal();

    fireEvent.press(screen.getByText(strings.buttons.create));

    expect(dismissKeyboardSpy).toHaveBeenCalled();
  });

  test('when the dialog is open, then tapping outside it does not close it or erase the typed name', () => {
    renderOpenCreateFolderModal();

    expect(getLastCenterModalProps().backdropPressToClose).toBe(false);
  });

  test('when creating the folder fails, then the user can try to create it again', async () => {
    createFolderMock.mockRejectedValueOnce(new Error('Network error')).mockReturnValue(new Promise(() => undefined));
    const screen = renderOpenCreateFolderModal();

    fireEvent.press(screen.getByText(strings.buttons.create));
    await waitFor(() => expect(showNotificationMock).toHaveBeenCalled());
    fireEvent.press(screen.getByText(strings.buttons.create));

    await waitFor(() => expect(createFolderMock).toHaveBeenCalledTimes(2));
  });
});
