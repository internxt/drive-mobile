import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { File as FSFile } from 'expo-file-system';
import mime from 'mime';
import prettysize from 'prettysize';
import strings from '../../assets/lang/strings';
import { HttpUploadError } from './errors';
import { SharedFile, UploadErrorType } from './types';

dayjs.extend(relativeTime);

export const formatDate = (dateStr: string): string => {
  const date = dayjs(dateStr);
  const weekDays = 7;
  return dayjs().diff(date, 'day') < weekDays ? date.fromNow() : date.toDate().toLocaleDateString();
};

export const readSize = (uri: string): number | null => {
  try {
    const file = new FSFile(uri);
    return file.exists ? file.size : null;
  } catch {
    return null;
  }
};

export const formatBytes = (bytes: number): string => prettysize(bytes);

export const getFileExtension = (fileName: string | null): string => {
  if (!fileName) return '';
  const lastDot = fileName.lastIndexOf('.');
  return lastDot > 0 ? fileName.slice(lastDot + 1).toLowerCase() : '';
};

export const getFileNameWithoutExtension = (fileName: string | null): string => {
  if (!fileName) return 'file';
  const lastDot = fileName.lastIndexOf('.');
  return lastDot > 0 ? fileName.slice(0, lastDot) : fileName;
};

export const getMimeTypeFromUri = (uri: string): string | null => {
  const lastSegment = uri.split('/').pop();
  const filename = lastSegment?.split('?')[0];
  return filename ? mime.getType(filename) : null;
};

export const getSharedFileExtension = (file: SharedFile): string => {
  if (file.mimeType) {
    const mimeSubtype = file.mimeType.split('/')[1];
    const isWildcard = mimeSubtype === '*';
    if (mimeSubtype && !isWildcard) return mimeSubtype.toUpperCase();
  }
  return getFileExtension(file.fileName).toUpperCase();
};

const extractFromJsonObject = (obj: Record<string, unknown>): string | null => {
  const message = obj.message ?? obj.error ?? obj.msg;
  return typeof message === 'string' && message.trim() ? message.trim() : null;
};

const parseJsonBody = (text: string): string | null => {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed !== null && typeof parsed === 'object') {
      return extractFromJsonObject(parsed as Record<string, unknown>);
    }
  } catch (error) {
    console.error('Failed to parse error response body as JSON', error);
  }
  return null;
};

const extractFromResponseBody = (error: object): string | null => {
  if (!(error instanceof HttpUploadError) || !error.responseBody.trim()) return null;
  const responseBodyTrimmed = error.responseBody.trim();
  return parseJsonBody(responseBodyTrimmed) ?? responseBodyTrimmed;
};

export const extractErrorMessage = (error: unknown): string | null => {
  if (!(error instanceof HttpUploadError)) return null;
  return extractFromResponseBody(error);
};

export const getUploadErrorMessage = (errorType: UploadErrorType | null, rawError?: unknown): string => {
  const shareExtensionTexts = strings.screens.ShareExtension;
  switch (errorType) {
    case 'no_internet':
      return shareExtensionTexts.errorNoInternet;
    case 'session_expired':
      return shareExtensionTexts.errorSessionExpired;
    case 'prep_failed':
      return shareExtensionTexts.errorPrep;
    case 'file_already_exists':
      return shareExtensionTexts.errorFileAlreadyExists;
    case 'payment_required':
      return shareExtensionTexts.errorPaymentRequired;
    case 'general':
      return extractErrorMessage(rawError) ?? shareExtensionTexts.errorGeneral;
    default:
      return shareExtensionTexts.errorGeneral;
  }
};
