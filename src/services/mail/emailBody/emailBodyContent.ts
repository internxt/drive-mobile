import { EmailResponse } from '@internxt/sdk/dist/mail/types';
import { decodeHTML, escapeUTF8 } from 'entities';
import { sanitizeMailHtml } from './sanitizeMailHtml';

export type EmailBodyContent = {
  content: string;
  isHtml: boolean;
};

/**
 * Where the body of a message that is about to be displayed comes from: it was decrypted, it is
 * encrypted and could not be read, or it arrived readable as it is.
 */
export type EmailBodySource = { type: 'decrypted'; text: string } | { type: 'encryptedUnreadable' } | { type: 'plain' };

export const escapeHtml = escapeUTF8;

const TAG_PATTERN = /<[^>]*>/g;
const BLANKS_PATTERN = /\s+/g;

/**
 * Reads a body written as markup as the text it displays: no tags, no entities, and the blank space
 * of the markup collapsed the way a browser would collapse it.
 *
 * @param html a body written as markup
 * @returns the text that body shows, in one run
 */
export const plainTextFromHtml = (html: string): string =>
  decodeHTML(html.replace(TAG_PATTERN, ' ')).replace(BLANKS_PATTERN, ' ').trim();

const OPENING_MARKUP_PATTERN = /^(?:<!doctype\s|<!--|<\?|<[a-z][a-z0-9]*(?:\s[^>]*)?\/?>)/i;
const EMBEDDED_MARKUP_PATTERN = /<\/[a-z][a-z0-9]*\s*>|<(?:br|hr|img|p|div|table|tr|td|ul|ol|li)\b[^>]*>/i;
const LEADING_BLANKS_PATTERN = /^[\s\uFEFF\u200B]+/;

/**
 * Tells whether the body of a message was written as markup. The envelope of an encrypted message
 * carries a single body and says nothing about its format, so the only way to know is to look at
 * it: `mail-web` and the mobile compose write markup there, and older messages may carry plain text.
 * A body that opens with a tag is markup, and so is one that carries a closing or a standalone tag
 * further in, which is what a message that opens with a line of text looks like.
 *
 * @param body the body of the message, as it was decrypted
 * @returns true when the body has to be read as markup
 */
export const isMarkupBody = (body: string): boolean => {
  const bodyWithoutLeadingBlanks = body.replace(LEADING_BLANKS_PATTERN, '');

  return (
    OPENING_MARKUP_PATTERN.test(bodyWithoutLeadingBlanks) || EMBEDDED_MARKUP_PATTERN.test(bodyWithoutLeadingBlanks)
  );
};

/**
 * Picks which of the bodies of a message has to be displayed.
 *
 * @param message the message as it came from the server
 * @param source where the body to display comes from
 * @returns the body to display and whether it is HTML or plain text
 */
export const resolveEmailBody = (message: EmailResponse, source: EmailBodySource): EmailBodyContent => {
  switch (source.type) {
    case 'decrypted':
      return { content: source.text, isHtml: isMarkupBody(source.text) };
    case 'encryptedUnreadable':
      return { content: '', isHtml: false };
    case 'plain':
      if (message.htmlBody) {
        return { content: message.htmlBody, isHtml: true };
      }
      if (message.textBody) {
        return { content: message.textBody, isHtml: false };
      }
      return { content: '', isHtml: false };
  }
};

/**
 * Turns the plain text body of a message into markup that displays it as written.
 *
 * @param text the body of the message, as plain text
 * @returns markup that shows the text with its line breaks and no character read as markup
 */
export const plainTextToHtml = (text: string): string => `<div style="white-space:pre-wrap">${escapeHtml(text)}</div>`;

/**
 * Produces the markup of a message that is safe to display, whichever of its bodies is used.
 *
 * @param message the message as it came from the server
 * @param source where the body to display comes from
 * @returns markup with the formatting of the message and nothing that can run or be followed
 */
export const buildEmailBodyHtml = (message: EmailResponse, source: EmailBodySource): string => {
  const { content, isHtml } = resolveEmailBody(message, source);
  return isHtml ? sanitizeMailHtml(content) : plainTextToHtml(content);
};
