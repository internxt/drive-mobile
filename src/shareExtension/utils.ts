import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { File as FSFile } from 'expo-file-system';
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
