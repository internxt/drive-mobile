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

/**
 * Adds the forward prefix to a subject, unless the subject already carries it.
 *
 * @param subject - Subject of the message being forwarded.
 * @returns The subject the forwarded message is sent with.
 */
export const forwardedSubject = (subject: string): string => {
  const { prefix } = strings.screens.compose_email.forward;

  return subject.trim().toLowerCase().startsWith(prefix.toLowerCase()) ? subject : `${prefix} ${subject}`;
};

/**
 * Quotes a message under a header that names who wrote it, when, and who it went to, the way every
 * other mail client forwards: the original keeps the format it was written in, so a message written
 * with formatting is not flattened on its way out. The quote is markup whichever format the original
 * had, and a quote that was already markup is filtered down to what is safe to display, because the
 * message goes out under the name of whoever forwards it.
 *
 * @param message - The message being forwarded.
 * @param bodySource - Where the body of that message comes from.
 * @returns The quoted original, as markup, and the text of the original on its own.
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
 * Writes the opening of a forwarded message, which is what the mailbox list shows before the message
 * is opened: what the user wrote, and the body of the original when they wrote nothing. The header
 * of the quote is left out, because every forward carries the same one and it would fill the row
 * before the message itself got a chance to show.
 *
 * @param note - What the user wrote above the quote.
 * @param quote - The quoted original.
 * @returns The opening of the message, as plain text.
 */
export const previewOfForward = (note: string, quote: ForwardedQuote): string =>
  note.trim() || quote.originalText.trim();

/**
 * Puts together the body a forwarded message travels with: what the user wrote, and the quoted
 * original below it.
 *
 * @param note - What the user wrote above the quote.
 * @param quote - The quoted original.
 * @returns The body of the forwarded message, as markup.
 */
export const composeForwardedBody = (note: string, quote: ForwardedQuote): string =>
  note.trim() ? `${plainTextToHtml(note)}<br>${quote.body}` : quote.body;
