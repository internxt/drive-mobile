import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { logger } from '@internxt-mobile/services/common/logger/logger.service';
import { discardDraft, saveDraft } from '@internxt-mobile/services/mail/draft.service';
import { DraftContent } from '../../../../types/mail';

export const DRAFT_AUTOSAVE_DELAY_MS = 10000;

/**
 * Keeps the draft of a message saved: some time after the last change, whenever the app leaves the
 * foreground, and whenever it is asked to. Saves run one after another, and nothing is saved while the
 * content is the same as when it was last saved or loaded.
 *
 * @param params - The draft to keep saved.
 * @param params.isEnabled - Whether the message keeps a draft at all.
 * @param params.initialDraftId - Id of the draft the message was opened from, if any.
 * @param params.isContentReady - Whether the content is the one the message starts from; nothing is
 * saved while it is not.
 * @param params.draftContent - What the draft holds right now.
 * @returns Whether a draft exists on the server, whether the last save failed, whether there are changes
 * not saved yet, and the actions that save it on demand, pause saving while the message is sent, resume
 * it, and discard the draft.
 */
export const useDraftAutosave = ({
  isEnabled,
  initialDraftId,
  isContentReady,
  draftContent,
}: {
  isEnabled: boolean;
  initialDraftId?: string;
  isContentReady: boolean;
  draftContent: DraftContent;
}) => {
  const [hasSavedDraft, setHasSavedDraft] = useState(!!initialDraftId);
  const [hasFailedToSave, setHasFailedToSave] = useState(false);
  const draftIdRef = useRef<string | null>(initialDraftId ?? null);
  const latestDraftContentRef = useRef(draftContent);
  const lastSavedContentKeyRef = useRef<string | null>(null);
  const pendingSaveRef = useRef<Promise<void>>(Promise.resolve());
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingPausedRef = useRef(false);

  const draftContentKey = JSON.stringify(draftContent);

  const clearAutosaveTimeout = () => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }
  };

  const hasUnsavedChanges = (): boolean =>
    isEnabled &&
    !isSavingPausedRef.current &&
    lastSavedContentKeyRef.current !== null &&
    JSON.stringify(latestDraftContentRef.current) !== lastSavedContentKeyRef.current;

  const saveDraftNow = (): Promise<void> => {
    clearAutosaveTimeout();
    const saveAfterPreviousSaves = pendingSaveRef.current.then(async () => {
      if (!hasUnsavedChanges()) {
        return;
      }
      const contentToSave = latestDraftContentRef.current;
      const contentKeyToSave = JSON.stringify(contentToSave);

      const savedDraftId = await saveDraft({ draftId: draftIdRef.current, content: contentToSave });
      if (savedDraftId) {
        draftIdRef.current = savedDraftId;
        setHasSavedDraft(true);
      }
      lastSavedContentKeyRef.current = contentKeyToSave;
      setHasFailedToSave(false);
    });

    pendingSaveRef.current = saveAfterPreviousSaves.catch((error) => {
      logger.error('Failed to save the draft', error);
      setHasFailedToSave(true);
    });

    return saveAfterPreviousSaves;
  };

  const scheduleAutosave = () => {
    clearAutosaveTimeout();
    autosaveTimeoutRef.current = setTimeout(() => {
      saveDraftNow().catch(() => undefined);
    }, DRAFT_AUTOSAVE_DELAY_MS);
  };

  useEffect(() => {
    latestDraftContentRef.current = draftContent;
    if (!isEnabled || !isContentReady) {
      return;
    }
    if (lastSavedContentKeyRef.current === null) {
      lastSavedContentKeyRef.current = draftContentKey;
      return;
    }
    if (draftContentKey === lastSavedContentKeyRef.current) {
      return;
    }

    scheduleAutosave();
  }, [draftContentKey, isEnabled, isContentReady]);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    const appStateSubscription = AppState.addEventListener('change', (appState) => {
      if (appState !== 'active') {
        saveDraftNow().catch(() => undefined);
      }
    });

    return () => {
      appStateSubscription.remove();
      clearAutosaveTimeout();
    };
  }, [isEnabled]);

  const stopSavingAndWaitForPendingSave = async (): Promise<void> => {
    isSavingPausedRef.current = true;
    clearAutosaveTimeout();
    await pendingSaveRef.current;
  };

  const pauseSavingForSending = async (): Promise<string | null> => {
    await stopSavingAndWaitForPendingSave();
    return draftIdRef.current;
  };

  const resumeSaving = () => {
    isSavingPausedRef.current = false;
    if (hasUnsavedChanges()) {
      scheduleAutosave();
    }
  };

  const discardSavedDraft = async (): Promise<void> => {
    await stopSavingAndWaitForPendingSave();
    if (draftIdRef.current) {
      await discardDraft(draftIdRef.current);
    }
  };

  return {
    hasSavedDraft,
    hasFailedToSave,
    hasUnsavedChanges,
    saveDraftNow,
    pauseSavingForSending,
    resumeSaving,
    discardSavedDraft,
  };
};
