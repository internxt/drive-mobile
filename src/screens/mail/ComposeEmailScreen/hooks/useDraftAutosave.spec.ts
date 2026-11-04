import { act, renderHook } from '@testing-library/react-native';
import { AppState, AppStateStatus } from 'react-native';

import { discardDraft, saveDraft } from '@internxt-mobile/services/mail/draft.service';
import { DraftContent } from '../../../../types/mail';
import { DRAFT_AUTOSAVE_DELAY_MS, useDraftAutosave } from './useDraftAutosave';

jest.mock('@internxt-mobile/services/mail/draft.service', () => ({
  saveDraft: jest.fn(),
  discardDraft: jest.fn(),
}));

jest.mock('@internxt-mobile/services/common/logger/logger.service', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const saveDraftMock = saveDraft as jest.Mock;
const discardDraftMock = discardDraft as jest.Mock;

const EMPTY_DRAFT_CONTENT: DraftContent = { to: [], cc: [], bcc: [], subject: '', body: '', draftAttachments: null };

const draftContentWithBody = (body: string): DraftContent => ({ ...EMPTY_DRAFT_CONTENT, body });

let appStateChangeListener: ((appState: AppStateStatus) => void) | undefined;

const renderDraftAutosave = ({
  initialDraftId,
  isEnabled = true,
  isContentReady = true,
}: {
  initialDraftId?: string;
  isEnabled?: boolean;
  isContentReady?: boolean;
} = {}) =>
  renderHook(
    (props: { draftContent: DraftContent; isContentReady: boolean }) =>
      useDraftAutosave({
        isEnabled,
        initialDraftId,
        isContentReady: props.isContentReady,
        draftContent: props.draftContent,
      }),
    { initialProps: { draftContent: EMPTY_DRAFT_CONTENT, isContentReady } },
  );

const settlePendingSaves = async () => {
  await act(async () => {
    for (let tickCount = 0; tickCount < 5; tickCount += 1) {
      await Promise.resolve();
    }
  });
};

describe('Keeping the draft of a message saved', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    appStateChangeListener = undefined;
    saveDraftMock.mockResolvedValue('saved-draft');
    discardDraftMock.mockResolvedValue(undefined);
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_eventType, listener) => {
      appStateChangeListener = listener as (appState: AppStateStatus) => void;
      return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('when nothing has changed since the message was opened, then nothing is saved', async () => {
    renderDraftAutosave();

    act(() => jest.advanceTimersByTime(DRAFT_AUTOSAVE_DELAY_MS));
    await settlePendingSaves();

    expect(saveDraftMock).not.toHaveBeenCalled();
  });

  test('when the message changes, then the draft is saved some time after the last change and not before', async () => {
    const { result, rerender } = renderDraftAutosave();

    rerender({ draftContent: draftContentWithBody('Hello'), isContentReady: true });
    act(() => jest.advanceTimersByTime(DRAFT_AUTOSAVE_DELAY_MS - 1));
    await settlePendingSaves();
    expect(saveDraftMock).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(1));
    await settlePendingSaves();

    expect(saveDraftMock).toHaveBeenCalledWith({ draftId: null, content: draftContentWithBody('Hello') });
    expect(result.current.hasSavedDraft).toBe(true);
  });

  test('when the message keeps changing, then it is saved only once, after the last change', async () => {
    const { rerender } = renderDraftAutosave();

    rerender({ draftContent: draftContentWithBody('Hello'), isContentReady: true });
    act(() => jest.advanceTimersByTime(DRAFT_AUTOSAVE_DELAY_MS / 2));
    rerender({ draftContent: draftContentWithBody('Hello there'), isContentReady: true });
    act(() => jest.advanceTimersByTime(DRAFT_AUTOSAVE_DELAY_MS / 2));
    await settlePendingSaves();
    expect(saveDraftMock).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(DRAFT_AUTOSAVE_DELAY_MS / 2));
    await settlePendingSaves();

    expect(saveDraftMock).toHaveBeenCalledTimes(1);
    expect(saveDraftMock).toHaveBeenCalledWith({ draftId: null, content: draftContentWithBody('Hello there') });
  });

  test('when the draft was already saved, then the next save replaces it', async () => {
    const { rerender } = renderDraftAutosave();

    rerender({ draftContent: draftContentWithBody('Hello'), isContentReady: true });
    act(() => jest.advanceTimersByTime(DRAFT_AUTOSAVE_DELAY_MS));
    await settlePendingSaves();
    rerender({ draftContent: draftContentWithBody('Hello there'), isContentReady: true });
    act(() => jest.advanceTimersByTime(DRAFT_AUTOSAVE_DELAY_MS));
    await settlePendingSaves();

    expect(saveDraftMock).toHaveBeenLastCalledWith({
      draftId: 'saved-draft',
      content: draftContentWithBody('Hello there'),
    });
  });

  test('when the app leaves the foreground with unsaved changes, then the draft is saved right away', async () => {
    const { rerender } = renderDraftAutosave();

    rerender({ draftContent: draftContentWithBody('Hello'), isContentReady: true });
    act(() => appStateChangeListener?.('background'));
    await settlePendingSaves();

    expect(saveDraftMock).toHaveBeenCalledWith({ draftId: null, content: draftContentWithBody('Hello') });
  });

  test('when the message is being sent, then nothing is saved and the draft it was written in is handed over', async () => {
    const { result, rerender } = renderDraftAutosave({ initialDraftId: 'draft-1' });

    rerender({ draftContent: draftContentWithBody('Hello'), isContentReady: true });
    let draftIdForSending: string | null = null;
    await act(async () => {
      draftIdForSending = await result.current.pauseSavingForSending();
    });
    act(() => jest.advanceTimersByTime(DRAFT_AUTOSAVE_DELAY_MS));
    act(() => appStateChangeListener?.('background'));
    await settlePendingSaves();

    expect(draftIdForSending).toBe('draft-1');
    expect(saveDraftMock).not.toHaveBeenCalled();
  });

  test('when sending fails and saving is resumed, then the draft can be saved again', async () => {
    const { result, rerender } = renderDraftAutosave({ initialDraftId: 'draft-1' });

    rerender({ draftContent: draftContentWithBody('Hello'), isContentReady: true });
    await act(async () => {
      await result.current.pauseSavingForSending();
    });
    act(() => result.current.resumeSaving());
    await act(async () => {
      await result.current.saveDraftNow();
    });

    expect(saveDraftMock).toHaveBeenCalledWith({ draftId: 'draft-1', content: draftContentWithBody('Hello') });
  });

  test('when the draft is discarded, then it is removed and nothing is saved afterwards', async () => {
    const { result, rerender } = renderDraftAutosave({ initialDraftId: 'draft-1' });

    rerender({ draftContent: draftContentWithBody('Hello'), isContentReady: true });
    await act(async () => {
      await result.current.discardSavedDraft();
    });
    act(() => appStateChangeListener?.('background'));
    act(() => jest.advanceTimersByTime(DRAFT_AUTOSAVE_DELAY_MS));
    await settlePendingSaves();

    expect(discardDraftMock).toHaveBeenCalledWith('draft-1');
    expect(saveDraftMock).not.toHaveBeenCalled();
  });

  test('when the message has changes that were not saved yet, then it is known to have unsaved changes until they are saved', async () => {
    const { result, rerender } = renderDraftAutosave();

    rerender({ draftContent: draftContentWithBody('Hello'), isContentReady: true });
    expect(result.current.hasUnsavedChanges()).toBe(true);

    await act(async () => {
      await result.current.saveDraftNow();
    });

    expect(result.current.hasUnsavedChanges()).toBe(false);
  });

  test('when nothing has changed since the message was opened, then it has no unsaved changes', () => {
    const { result } = renderDraftAutosave({ initialDraftId: 'draft-1' });

    expect(result.current.hasUnsavedChanges()).toBe(false);
  });

  test('when the message is being sent, then there are no unsaved changes left to wait for', async () => {
    const { result, rerender } = renderDraftAutosave();

    rerender({ draftContent: draftContentWithBody('Hello'), isContentReady: true });
    await act(async () => {
      await result.current.pauseSavingForSending();
    });

    expect(result.current.hasUnsavedChanges()).toBe(false);
  });

  test('when the message keeps no draft, then nothing is ever saved', async () => {
    const { rerender } = renderDraftAutosave({ isEnabled: false });

    rerender({ draftContent: draftContentWithBody('Hello'), isContentReady: true });
    act(() => jest.advanceTimersByTime(DRAFT_AUTOSAVE_DELAY_MS));
    await settlePendingSaves();

    expect(saveDraftMock).not.toHaveBeenCalled();
  });

  test('when a save fails, then the draft counts as not saved until a later save succeeds', async () => {
    saveDraftMock.mockRejectedValueOnce(new Error('the server is unreachable'));
    const { result, rerender } = renderDraftAutosave();

    rerender({ draftContent: draftContentWithBody('Hello'), isContentReady: true });
    act(() => jest.advanceTimersByTime(DRAFT_AUTOSAVE_DELAY_MS));
    await settlePendingSaves();
    expect(result.current.hasFailedToSave).toBe(true);
    expect(result.current.hasUnsavedChanges()).toBe(true);

    rerender({ draftContent: draftContentWithBody('Hello there'), isContentReady: true });
    act(() => jest.advanceTimersByTime(DRAFT_AUTOSAVE_DELAY_MS));
    await settlePendingSaves();

    expect(result.current.hasFailedToSave).toBe(false);
    expect(saveDraftMock).toHaveBeenLastCalledWith({ draftId: null, content: draftContentWithBody('Hello there') });
  });

  test('when saving resumes with changes still waiting, then they are saved some time later without another change', async () => {
    const { result, rerender } = renderDraftAutosave({ initialDraftId: 'draft-1' });

    rerender({ draftContent: draftContentWithBody('Hello'), isContentReady: true });
    await act(async () => {
      await result.current.pauseSavingForSending();
    });
    act(() => result.current.resumeSaving());
    act(() => jest.advanceTimersByTime(DRAFT_AUTOSAVE_DELAY_MS));
    await settlePendingSaves();

    expect(saveDraftMock).toHaveBeenCalledWith({ draftId: 'draft-1', content: draftContentWithBody('Hello') });
  });

  test('when a draft finishes loading, then what it arrives with is not saved as a change', async () => {
    const { rerender } = renderDraftAutosave({ initialDraftId: 'draft-1', isContentReady: false });

    rerender({ draftContent: draftContentWithBody('Loaded body'), isContentReady: true });
    act(() => jest.advanceTimersByTime(DRAFT_AUTOSAVE_DELAY_MS));
    await settlePendingSaves();

    expect(saveDraftMock).not.toHaveBeenCalled();
  });
});
