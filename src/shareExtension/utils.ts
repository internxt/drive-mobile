import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { File as FSFile } from 'expo-file-system';
import mime from 'mime';
import prettysize from 'prettysize';

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
