import type { Dispatch } from 'redux';
import strings from '../../../../../assets/lang/strings';
import { uiActions } from '../../../../store/slices/ui';

export class FileSizeExceededError extends Error {
  constructor() {
    super('File size exceeds the maximum allowed by your plan');
    this.name = 'FileSizeExceededError';
    Object.setPrototypeOf(this, FileSizeExceededError.prototype);
  }
}

export const isFileSizeExceededError = (error: unknown): boolean => {
  const e = error as { response?: { data?: { error?: string } }; data?: { error?: string } };
  return e?.response?.data?.error === 'FILE_UPLOAD_SIZE_EXCEEDED' || e?.data?.error === 'FILE_UPLOAD_SIZE_EXCEEDED';
};

export const notifyFilesExcludedBySize = (excluded: { name: string }[], dispatch: Dispatch) => {
  const [firstExcluded, ...remainingExcluded] = excluded;
  if (firstExcluded === undefined) return;
  const hasMultipleExcluded = remainingExcluded.length > 0;
  const message = hasMultipleExcluded
    ? strings.formatString(strings.modals.FileSizeExceededModal.messageWithCount, excluded.length)
    : strings.formatString(strings.modals.FileSizeExceededModal.messageWithName, firstExcluded.name);
  dispatch(uiActions.setFileSizeExceededMessage(message));
};
