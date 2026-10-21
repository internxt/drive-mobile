import { time } from '../../../../services/common/time/time.service';

const SHORT_MESSAGE_TIME_FORMAT = 'd LLL · HH:mm';
const FULL_MESSAGE_TIME_FORMAT = 'd LLL yyyy, HH:mm';

export const formatShortMessageTime = (receivedAt: string): string =>
  time.getFormattedDate(receivedAt, SHORT_MESSAGE_TIME_FORMAT);

export const formatFullMessageTime = (receivedAt: string): string =>
  time.getFormattedDate(receivedAt, FULL_MESSAGE_TIME_FORMAT);
