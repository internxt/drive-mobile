import { EmailAddress, EmailResponse } from '@internxt/sdk/dist/mail/types';
import dayjs from 'dayjs';

import strings from '../../../assets/lang/strings';
import { ForwardedQuote } from '../../types/mail';
import {
  escapeHtml,
  plainTextFromHtml,
  plainTextToHtml,
  resolveEmailBody,
  type EmailBodySource,
} from './emailBody/emailBodyContent';
import { sanitizeMailHtml } from './emailBody/sanitizeMailHtml';

const QUOTE_DATE_FORMAT = 'MMM D, YYYY, h:mm A';

const formatAddress = (address: EmailAddress): string => {
  const name = address.name?.trim();
  return name ? `${name} <${address.email}>` : address.email;
};

const formatAddresses = (addresses: EmailAddress[] | undefined): string =>
  (addresses ?? []).map(formatAddress).join(', ');

/** Adds the forward prefix to a subject, unless the subject already carries it. */
export const forwardedSubject = (subject: string): string => {
  const { prefix } = strings.screens.compose_email.forward;

  return subject.trim().toLowerCase().startsWith(prefix.toLowerCase()) ? subject : `${prefix} ${subject}`;
};

/**
 * Quotes a message under a header that names who wrote it, when, and who it went to. The original
 * keeps the format it was written in. The quote is markup whichever format the original had, and a
 * quote that was already markup is filtered down to what is safe to display.
 */
export const buildForwardedQuote = (message: EmailResponse, bodySource: EmailBodySource): ForwardedQuote => {
  const labels = strings.screens.compose_email.forward;
  const { content, isHtml } = resolveEmailBody(message, bodySource);
  const sentAt = dayjs(message.sentAt ?? message.receivedAt).format(QUOTE_DATE_FORMAT);

  const headerLines = [
    labels.header,
    ...(message.from?.length ? [`${labels.from} ${formatAddress(message.from[0])}`] : []),
    `${labels.date} ${sentAt}`,
    `${labels.subject} ${message.subject}`,
    `${labels.to} ${formatAddresses(message.to)}`,
    ...(message.cc?.length ? [`${labels.cc} ${formatAddresses(message.cc)}`] : []),
  ];

  const header = headerLines.map((line) => escapeHtml(line)).join('<br>');
  const quotedContent = isHtml ? sanitizeMailHtml(content) : plainTextToHtml(content);

  return {
    body: `<div>${header}</div><br>${quotedContent}`,
    originalText: isHtml ? plainTextFromHtml(quotedContent) : content,
  };
};

/**
 * Writes the opening of a forwarded message: what the user wrote, or the body of the original when
 * they wrote nothing. The header of the quote is left out.
 *
 * @returns The opening of the message, as plain text.
 */
export const previewOfForward = (note: string, quote: ForwardedQuote): string =>
  plainTextFromHtml(note) || quote.originalText.trim();

/**
 * Puts together the body a forwarded message travels with: what the user wrote, and the quoted
 * original below it.
 *
 * @returns The body of the forwarded message, as markup.
 */
export const composeForwardedBody = (note: string, quote: ForwardedQuote): string =>
  plainTextFromHtml(note) ? `${note}<br>${quote.body}` : quote.body;
