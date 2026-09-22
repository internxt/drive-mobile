import { act, renderHook } from '@testing-library/react-native';
import { Alert, AlertButton } from 'react-native';

import { openDraft } from '@internxt-mobile/services/mail/draft.service';
import strings from '../../../../../assets/lang/strings';
import { HTTP_NOT_FOUND, HTTP_TOO_MANY_REQUESTS } from '../../../../services/common/httpStatusCodes';
import { notifications } from '../../../../services/NotificationsService';
import { DraftComposeParams } from '../../../../types/mail';
import { RootStackScreenProps } from '../../../../types/navigation';
import { useDraftAutosave } from './useDraftAutosave';
import { LEAVE_WITHOUT_SAVING_DELAY_MS, useDraftLifecycle } from './useDraftLifecycle';

jest.mock('./useDraftAutosave', () => ({ useDraftAutosave: jest.fn() }));

jest.mock('@internxt-mobile/services/mail/draft.service', () => ({ openDraft: jest.fn() }));

jest.mock('../../../../services/NotificationsService', () => ({
  notifications: { error: jest.fn(), success: jest.fn(), info: jest.fn() },
}));

jest.mock('@internxt-mobile/services/common/logger/logger.service', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const useDraftAutosaveMock = useDraftAutosave as jest.Mock;
const openDraftMock = openDraft as jest.Mock;
const notifyErrorMock = notifications.error as jest.Mock;
const notifyInfoMock = notifications.info as jest.Mock;

const LEAVE_ACTION = { type: 'GO_BACK' };
const NO_RECIPIENTS = { to: [], cc: [], bcc: [] };

const draftAutosave = {
  hasSavedDraft: true,
  hasFailedToSave: false,
  hasUnsavedChanges: jest.fn(),
  saveDraftNow: jest.fn(),
  pauseSavingForSending: jest.fn(),
  resumeSaving: jest.fn(),
  discardSavedDraft: jest.fn(),
};

const createNavigation = () => {
  let beforeRemoveListener: (removalEvent: unknown) => void = () => undefined;
  const navigation = {
    addListener: jest.fn((_eventName: string, listener: (removalEvent: unknown) => void) => {
      beforeRemoveListener = listener;
      return jest.fn();
    }),
    dispatch: jest.fn(),
    goBack: jest.fn(),
  };
  const tryToLeave = () => {
    const removalEvent = { preventDefault: jest.fn(), data: { action: LEAVE_ACTION } };
    act(() => beforeRemoveListener(removalEvent));
    return removalEvent;
  };
  return { navigation, tryToLeave };
};

const renderDraftLifecycle = ({
  isEnabled = true,
  draftToOpen,
  mnemonic = 'the words',
  onDraftOpened = jest.fn(),
}: {
  isEnabled?: boolean;
  draftToOpen?: DraftComposeParams;
  mnemonic?: string;
  onDraftOpened?: jest.Mock;
} = {}) => {
  const { navigation, tryToLeave } = createNavigation();
  const rendered = renderHook(() =>
    useDraftLifecycle({
      navigation: navigation as unknown as RootStackScreenProps<'ComposeEmail'>['navigation'],
      draftToOpen,
      isEnabled,
      mnemonic,
      recipients: NO_RECIPIENTS,
      subject: '',
      body: '',
      onDraftOpened,
    }),
  );
  return { ...rendered, navigation, tryToLeave };
};

const settlePendingWork = async () => {
  await act(async () => {
    for (let tickCount = 0; tickCount < 5; tickCount += 1) {
      await Promise.resolve();
    }
  });
};

const saveThatFinishesWhenTold = () => {
  let finishSave: () => void = () => undefined;
  let failSave: () => void = () => undefined;
  draftAutosave.saveDraftNow.mockImplementationOnce(
    () =>
      new Promise<void>((resolve, reject) => {
        finishSave = resolve;
        failSave = () => reject(new Error('the server is unreachable'));
      }),
  );
  return { finish: () => finishSave(), fail: () => failSave() };
};

const pressAlertButton = (alertSpy: jest.SpyInstance, buttonStyle: AlertButton['style']) => {
  const alertButtons = alertSpy.mock.calls[0][2] as AlertButton[];
  act(() => alertButtons.find((button) => button.style === buttonStyle)?.onPress?.());
};

describe('Taking care of the draft of a message being written', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useDraftAutosaveMock.mockReturnValue(draftAutosave);
    draftAutosave.hasFailedToSave = false;
    draftAutosave.hasUnsavedChanges.mockReturnValue(false);
    draftAutosave.saveDraftNow.mockResolvedValue(undefined);
    draftAutosave.pauseSavingForSending.mockResolvedValue('draft-1');
    draftAutosave.discardSavedDraft.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('when a draft is opened, then what it holds is handed to the screen and it counts as loaded', async () => {
    const keptAttachments = { attachmentsSessionKey: 'the-draft-key', attachments: [] };
    openDraftMock.mockResolvedValue({
      to: ['friend@inxt.me'],
      cc: [],
      bcc: [],
      subject: 'Plans',
      body: 'Hello',
      draftAttachments: keptAttachments,
    });
    const onDraftOpened = jest.fn();

    const { result } = renderDraftLifecycle({ draftToOpen: { draftId: 'draft-1' }, onDraftOpened });
    expect(result.current.isDraftLoaded).toBe(false);
    await settlePendingWork();

    expect(onDraftOpened).toHaveBeenCalledWith({
      to: ['friend@inxt.me'],
      cc: [],
      bcc: [],
      subject: 'Plans',
      body: 'Hello',
    });
    expect(result.current.draftAttachments).toEqual(keptAttachments);
    expect(result.current.isDraftLoaded).toBe(true);
  });

  test('when a draft cannot be opened, then the failure is shown and the screen goes back', async () => {
    openDraftMock.mockRejectedValue(new Error('the draft cannot be decrypted'));

    const { navigation } = renderDraftLifecycle({ draftToOpen: { draftId: 'draft-1' } });
    await settlePendingWork();

    expect(notifyErrorMock).toHaveBeenCalledWith(strings.screens.compose_email.draft.openFailed);
    expect(navigation.goBack).toHaveBeenCalled();
  });

  test('when the draft to open no longer exists, then the user is told so without an error and the screen goes back', async () => {
    openDraftMock.mockRejectedValue(Object.assign(new Error('Not found'), { status: HTTP_NOT_FOUND }));

    const { navigation } = renderDraftLifecycle({ draftToOpen: { draftId: 'draft-1' } });
    await settlePendingWork();

    expect(notifyInfoMock).toHaveBeenCalledWith(strings.screens.compose_email.draft.notFound);
    expect(notifyErrorMock).not.toHaveBeenCalled();
    expect(navigation.goBack).toHaveBeenCalled();
  });

  test('when the screen is left before the draft finishes opening, then nothing is shown and nothing goes back', async () => {
    let failOpening: () => void = () => undefined;
    openDraftMock.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          failOpening = () => reject(new Error('the draft cannot be decrypted'));
        }),
    );

    const { navigation, unmount } = renderDraftLifecycle({ draftToOpen: { draftId: 'draft-1' } });
    unmount();
    failOpening();
    await settlePendingWork();

    expect(notifyErrorMock).not.toHaveBeenCalled();
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  test('when the user leaves with nothing left to save, then the screen is left right away', () => {
    const { tryToLeave } = renderDraftLifecycle();

    const removalEvent = tryToLeave();

    expect(removalEvent.preventDefault).not.toHaveBeenCalled();
    expect(draftAutosave.saveDraftNow).not.toHaveBeenCalled();
  });

  test('when the user leaves with unsaved changes, then the screen stays behind the loader until the draft is saved', async () => {
    draftAutosave.hasUnsavedChanges.mockReturnValue(true);
    const save = saveThatFinishesWhenTold();
    const { result, navigation, tryToLeave } = renderDraftLifecycle();

    const removalEvent = tryToLeave();
    const secondRemovalEvent = tryToLeave();

    expect(removalEvent.preventDefault).toHaveBeenCalled();
    expect(secondRemovalEvent.preventDefault).toHaveBeenCalled();
    expect(result.current.blockingLoaderProps.isOpen).toBe(true);
    expect(draftAutosave.saveDraftNow).toHaveBeenCalledTimes(1);
    expect(navigation.dispatch).not.toHaveBeenCalled();

    await act(async () => save.finish());
    await settlePendingWork();

    expect(result.current.blockingLoaderProps.isOpen).toBe(false);
    expect(navigation.dispatch).toHaveBeenCalledWith(LEAVE_ACTION);
  });

  test('when the screen was left after saving but is still there, then leaving again saves again', async () => {
    draftAutosave.hasUnsavedChanges.mockReturnValue(true);
    const { tryToLeave } = renderDraftLifecycle();

    tryToLeave();
    await settlePendingWork();
    const laterRemovalEvent = tryToLeave();

    expect(laterRemovalEvent.preventDefault).toHaveBeenCalled();
    expect(draftAutosave.saveDraftNow).toHaveBeenCalledTimes(2);
  });

  test('when saving before leaving takes too long, then the user can leave without waiting for it', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    jest.useFakeTimers();
    draftAutosave.hasUnsavedChanges.mockReturnValue(true);
    const save = saveThatFinishesWhenTold();
    const { result, navigation, tryToLeave } = renderDraftLifecycle();

    tryToLeave();
    act(() => jest.advanceTimersByTime(LEAVE_WITHOUT_SAVING_DELAY_MS - 1));
    expect(result.current.blockingLoaderProps.onAction).toBeUndefined();

    act(() => jest.advanceTimersByTime(1));
    act(() => result.current.blockingLoaderProps.onAction?.());

    expect(navigation.dispatch).toHaveBeenCalledWith(LEAVE_ACTION);
    expect(result.current.blockingLoaderProps.isOpen).toBe(false);

    await act(async () => save.fail());
    await settlePendingWork();

    expect(navigation.dispatch).toHaveBeenCalledTimes(1);
    expect(alertSpy).not.toHaveBeenCalled();
  });

  test('when the screen goes away while the draft is saved before leaving, then no timer is left behind', () => {
    jest.useFakeTimers();
    draftAutosave.hasUnsavedChanges.mockReturnValue(true);
    saveThatFinishesWhenTold();
    const { tryToLeave, unmount } = renderDraftLifecycle();

    tryToLeave();
    unmount();

    expect(jest.getTimerCount()).toBe(0);
  });

  test('when saving before leaving fails, then the user stays on the screen and can choose to leave without saving', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    draftAutosave.hasUnsavedChanges.mockReturnValue(true);
    const save = saveThatFinishesWhenTold();
    const { result, navigation, tryToLeave } = renderDraftLifecycle();

    tryToLeave();
    await act(async () => save.fail());
    await settlePendingWork();

    expect(navigation.dispatch).not.toHaveBeenCalled();
    expect(result.current.blockingLoaderProps.isOpen).toBe(false);
    expect(alertSpy.mock.calls[0][0]).toBe(strings.screens.compose_email.draft.saveFailed);

    pressAlertButton(alertSpy, 'destructive');

    expect(navigation.dispatch).toHaveBeenCalledWith(LEAVE_ACTION);
  });

  test('when saving before leaving fails and the user keeps editing, then the screen stays and leaving later saves again', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    draftAutosave.hasUnsavedChanges.mockReturnValue(true);
    const save = saveThatFinishesWhenTold();
    const { navigation, tryToLeave } = renderDraftLifecycle();

    tryToLeave();
    await act(async () => save.fail());
    await settlePendingWork();
    pressAlertButton(alertSpy, 'cancel');
    const laterRemovalEvent = tryToLeave();

    expect(navigation.dispatch).not.toHaveBeenCalled();
    expect(laterRemovalEvent.preventDefault).toHaveBeenCalled();
    expect(draftAutosave.saveDraftNow).toHaveBeenCalledTimes(2);
  });

  test('when the message keeps no draft, then leaving is never held for a save', () => {
    draftAutosave.hasUnsavedChanges.mockReturnValue(false);
    const { tryToLeave } = renderDraftLifecycle({ isEnabled: false });

    const removalEvent = tryToLeave();

    expect(removalEvent.preventDefault).not.toHaveBeenCalled();
    expect(draftAutosave.saveDraftNow).not.toHaveBeenCalled();
  });

  test('when the draft failed to save, then the screen is told so', () => {
    draftAutosave.hasFailedToSave = true;

    const { result } = renderDraftLifecycle();

    expect(result.current.hasFailedToSaveDraft).toBe(true);
  });

  test('when a message that keeps no draft is written, then it is never said to have failed to save', () => {
    draftAutosave.hasFailedToSave = true;

    const { result } = renderDraftLifecycle({ isEnabled: false });

    expect(result.current.hasFailedToSaveDraft).toBe(false);
    expect(result.current.canDiscardDraft).toBe(false);
  });

  test('when the user confirms discarding the draft, then it is discarded and the screen goes back', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { result, navigation } = renderDraftLifecycle();

    act(() => result.current.confirmAndDiscardDraft());
    pressAlertButton(alertSpy, 'destructive');
    await settlePendingWork();

    expect(draftAutosave.discardSavedDraft).toHaveBeenCalled();
    expect(navigation.goBack).toHaveBeenCalled();
  });

  test('when discarding the draft fails, then the user stays on the screen, the draft keeps being saved and the failure is shown', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    draftAutosave.discardSavedDraft.mockRejectedValue(new Error('the server is unreachable'));
    const { result, navigation } = renderDraftLifecycle();

    act(() => result.current.confirmAndDiscardDraft());
    pressAlertButton(alertSpy, 'destructive');
    await settlePendingWork();

    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(result.current.blockingLoaderProps.isOpen).toBe(false);
    expect(draftAutosave.resumeSaving).toHaveBeenCalled();
    expect(notifyErrorMock).toHaveBeenCalledWith(strings.screens.compose_email.draft.discardFailed);
  });

  test('when the message is about to be sent, then saving stops and the draft it was written in is handed over', async () => {
    const { result } = renderDraftLifecycle();

    let draftIdForSending: string | undefined;
    await act(async () => {
      draftIdForSending = await result.current.prepareDraftForSending();
    });

    expect(draftAutosave.pauseSavingForSending).toHaveBeenCalled();
    expect(draftIdForSending).toBe('draft-1');
  });

  test('when the message is being sent, then the screen cannot be left until the send fails', async () => {
    const { result, tryToLeave } = renderDraftLifecycle({ isEnabled: false });

    await act(async () => {
      await result.current.prepareDraftForSending();
    });
    const removalEventWhileSending = tryToLeave();
    await act(async () => {
      await result.current.handleFailedSend(new Error('the server is unreachable'));
    });
    const removalEventAfterFailing = tryToLeave();

    expect(removalEventWhileSending.preventDefault).toHaveBeenCalled();
    expect(removalEventAfterFailing.preventDefault).not.toHaveBeenCalled();
  });

  test('when the message was sent, then the screen is left', async () => {
    const { result, navigation } = renderDraftLifecycle();

    await act(async () => {
      await result.current.prepareDraftForSending();
    });
    act(() => result.current.leaveAfterSending());

    expect(navigation.goBack).toHaveBeenCalled();
  });

  test('when the server refuses a send for reaching the sending limit, then the draft is saved and the user is told it was kept', async () => {
    const { result } = renderDraftLifecycle();
    const throttledError = Object.assign(new Error('Too many requests'), { status: HTTP_TOO_MANY_REQUESTS });

    let failureMessage = '';
    await act(async () => {
      failureMessage = await result.current.handleFailedSend(throttledError);
    });

    expect(draftAutosave.resumeSaving).toHaveBeenCalled();
    expect(draftAutosave.saveDraftNow).toHaveBeenCalled();
    expect(failureMessage).toBe(strings.screens.compose_email.errors.sendRateLimitedDraftSaved);
  });

  test('when the sending limit is reached and the draft cannot be saved either, then the user is not told it was kept', async () => {
    draftAutosave.saveDraftNow.mockRejectedValue(new Error('the server is unreachable'));
    const { result } = renderDraftLifecycle();
    const throttledError = Object.assign(new Error('Too many requests'), { status: HTTP_TOO_MANY_REQUESTS });

    let failureMessage = '';
    await act(async () => {
      failureMessage = await result.current.handleFailedSend(throttledError);
    });

    expect(failureMessage).toBe(strings.screens.compose_email.errors.sendRateLimited);
  });

  test('when a send fails for any other reason, then saving resumes without saving right away', async () => {
    const { result } = renderDraftLifecycle();

    let failureMessage = '';
    await act(async () => {
      failureMessage = await result.current.handleFailedSend(new Error('the server is unreachable'));
    });

    expect(draftAutosave.resumeSaving).toHaveBeenCalled();
    expect(draftAutosave.saveDraftNow).not.toHaveBeenCalled();
    expect(failureMessage).toBe(strings.screens.compose_email.errors.sendFailed);
  });

  test('when a message that keeps no draft fails to send, then no draft is saved', async () => {
    const { result } = renderDraftLifecycle({ isEnabled: false });
    const throttledError = Object.assign(new Error('Too many requests'), { status: HTTP_TOO_MANY_REQUESTS });

    await act(async () => {
      await result.current.handleFailedSend(throttledError);
    });

    expect(draftAutosave.resumeSaving).not.toHaveBeenCalled();
    expect(draftAutosave.saveDraftNow).not.toHaveBeenCalled();
  });
});
