import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, RenderResult, waitFor } from '@testing-library/react-native';
import { Keyboard } from 'react-native';
import { Provider } from 'react-redux';

import drive from '@internxt-mobile/services/drive';
import strings from '../../../../assets/lang/strings';
import uiReducer from '../../../store/slices/ui';
import notificationsService from '../../../services/NotificationsService';
import { CenterModalProps } from '../CenterModal';
import RenameModal from './index';

jest.mock('@burstware/react-native-portal', () => ({
  __esModule: true,
  default: ({ children }: { children: JSX.Element }) => children,
}));

jest.mock('../CenterModal', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@internxt-mobile/hooks/drive', () => ({
  useDrive: () => ({ focusedFolder: { uuid: 'parent-folder-uuid' }, updateItemInTree: jest.fn() }),
}));

jest.mock('@internxt-mobile/services/drive', () => ({
  __esModule: true,
  default: {
    database: { updateItemName: jest.fn() },
    file: { updateMetaData: jest.fn() },
    folder: { updateMetaData: jest.fn() },
  },
}));

jest.mock('../../../store/slices/drive', () => ({
  driveActions: {
    setFocusedItem: (payload: unknown) => ({ type: 'drive/setFocusedItem', payload }),
  },
}));

jest.mock('../../../services/common', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

jest.mock('../../../services/ErrorService', () => ({
  __esModule: true,
  default: { castError: (error: Error) => error },
}));

jest.mock('../../../services/NotificationsService', () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));

jest.mock('../../../services/native/InternxtSignalingModule', () => ({
  notifyParentChanged: jest.fn(),
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
const updateFileMetaDataMock = drive.file.updateMetaData as jest.Mock;
const showNotificationMock = notificationsService.show as jest.Mock;

// The first render loads the whole modal tree and can take longer than the default 5 s on CI.
const RENDER_TEST_TIMEOUT_MS = 15000;
jest.setTimeout(RENDER_TEST_TIMEOUT_MS);

const ORIGINAL_NAME = 'report';
const NEW_NAME = 'final report';
const NAME_TYPED_AFTERWARDS = 'final report v2';

const renderOpenRenameModal = () => {
  const store = configureStore({
    reducer: {
      ui: uiReducer,
      drive: () => ({ focusedItem: { uuid: 'file-uuid', name: ORIGINAL_NAME, type: 'pdf' } }),
      auth: () => ({ user: { uuid: 'user-uuid' } }),
    },
    preloadedState: { ui: { ...uiReducer(undefined, { type: 'init' }), showRenameModal: true } },
  });
  const screen = render(
    <Provider store={store}>
      <RenameModal />
    </Provider>,
  );
  fireEvent.changeText(screen.getByDisplayValue(''), NEW_NAME);
  return screen;
};

const pressRenameButton = (screen: RenderResult) => {
  const [, renameButton] = screen.getAllByText(strings.buttons.rename);
  fireEvent.press(renameButton);
};

const getLastCenterModalProps = (): CenterModalProps => CenterModalMock.mock.calls.at(-1)[0];

describe('Renaming an item', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    CenterModalMock.mockImplementation(({ isOpen, children }: CenterModalProps) => (isOpen ? children : null));
  });

  test('when the user confirms the new name, then the keyboard closes and the name can no longer be edited while it is saved', async () => {
    updateFileMetaDataMock.mockReturnValue(new Promise(() => undefined));
    const dismissKeyboardSpy = jest.spyOn(Keyboard, 'dismiss');
    const screen = renderOpenRenameModal();

    pressRenameButton(screen);

    expect(dismissKeyboardSpy).toHaveBeenCalled();
    await waitFor(() => expect(updateFileMetaDataMock).toHaveBeenCalled());
    fireEvent.changeText(screen.getByDisplayValue(NEW_NAME), NAME_TYPED_AFTERWARDS);
    expect(screen.queryByDisplayValue(NAME_TYPED_AFTERWARDS)).toBeNull();
  });

  test('when the new name is being saved, then neither the cancel button nor the back button can close the dialog', async () => {
    updateFileMetaDataMock.mockReturnValue(new Promise(() => undefined));
    const screen = renderOpenRenameModal();

    pressRenameButton(screen);

    await waitFor(() => expect(getLastCenterModalProps().backButtonClose).toBe(false));
    fireEvent.press(screen.getByText(strings.buttons.cancel));
    expect(getLastCenterModalProps().isOpen).toBe(true);
  });

  test('when saving the new name fails, then the name can be edited again and the dialog can be closed', async () => {
    updateFileMetaDataMock.mockRejectedValue(new Error('Network error'));
    const screen = renderOpenRenameModal();

    pressRenameButton(screen);

    await waitFor(() => expect(showNotificationMock).toHaveBeenCalled());
    fireEvent.changeText(screen.getByDisplayValue(NEW_NAME), NAME_TYPED_AFTERWARDS);
    expect(screen.getByDisplayValue(NAME_TYPED_AFTERWARDS)).toBeTruthy();
    expect(getLastCenterModalProps().backButtonClose).not.toBe(false);
    fireEvent.press(screen.getByText(strings.buttons.cancel));
    expect(getLastCenterModalProps().isOpen).toBe(false);
  });
});
