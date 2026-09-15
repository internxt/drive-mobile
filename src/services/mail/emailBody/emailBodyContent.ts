import { EmailResponse } from '@internxt/sdk/dist/mail/types';
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

const HTML_ENTITY_BY_CHARACTER: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  '\'': '&#39;',
};

/**
 * Turns text into markup that shows it as written, with nothing in it read as markup.
 *
 * @param text the text to show as written
 * @returns the same text with every character that means something in markup replaced
 */
export const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, (character) => HTML_ENTITY_BY_CHARACTER[character]);

const CHARACTER_BY_HTML_ENTITY: Record<string, string> = {
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': '\'',
  '&nbsp;': ' ',
  '&amp;': '&',
};

const HTML_ENTITY_PATTERN = /&lt;|&gt;|&quot;|&#39;|&nbsp;|&amp;/g;
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
  html
    .replace(TAG_PATTERN, ' ')
    .replace(HTML_ENTITY_PATTERN, (entity) => CHARACTER_BY_HTML_ENTITY[entity])
    .replace(BLANKS_PATTERN, ' ')
    .trim();

const EMBEDDED_CODE_PATTERN = /<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const LINE_BREAK_BETWEEN_TAGS_PATTERN = />[ \t]*\r?\n\s*</g;
const LINE_BREAK_TAG_BEFORE_BLOCK_END_PATTERN = /<br\s*\/?>\s*(<\/(?:p|div|li|h[1-6]|tr|blockquote)\s*>)/gi;
const LINE_BREAK_TAG_PATTERN = /<br\s*\/?>/gi;
const BLOCK_START_AFTER_TEXT_PATTERN = /([^>\n])(<(?:p|div|li|ul|ol|h[1-6]|tr|table|blockquote)\b)/gi;
const CLOSING_BLOCK_TAG_PATTERN = /<\/(?:p|div|li|h[1-6]|tr|blockquote)\s*>/gi;
const EDITABLE_HTML_ENTITY_PATTERN = /&(?:lt|gt|quot|nbsp|amp|#\d+|#x[0-9a-f]+);/gi;
const TRAILING_LINE_BREAKS_PATTERN = /\n+$/;
const HEXADECIMAL_RADIX = 16;
const NON_BREAKING_SPACE_CODE_POINT = 160;
const LAST_UNICODE_CODE_POINT = 0x10ffff;

const decodeHtmlEntity = (entity: string): string => {
  const lowercaseEntity = entity.toLowerCase();
  if (!lowercaseEntity.startsWith('&#')) {
    return CHARACTER_BY_HTML_ENTITY[lowercaseEntity];
  }

  const codePoint = lowercaseEntity.startsWith('&#x')
    ? parseInt(lowercaseEntity.slice(3, -1), HEXADECIMAL_RADIX)
    : Number(lowercaseEntity.slice(2, -1));
  if (codePoint === NON_BREAKING_SPACE_CODE_POINT) {
    return ' ';
  }
  return codePoint > 0 && codePoint <= LAST_UNICODE_CODE_POINT ? String.fromCodePoint(codePoint) : entity;
};

/**
 * Reads a body written as markup back as text that can be edited in a plain text field, keeping its
 * line breaks: a line break tag or the end of a paragraph becomes a line break, and the text inside
 * the markup keeps the line breaks it already had.
 *
 * @param html a body written as markup
 * @returns the text the body holds, with its line breaks
 */
export const editableTextFromHtml = (html: string): string =>
  html
    .replace(EMBEDDED_CODE_PATTERN, '')
    .replace(LINE_BREAK_BETWEEN_TAGS_PATTERN, '><')
    .replace(LINE_BREAK_TAG_BEFORE_BLOCK_END_PATTERN, '$1')
    .replace(LINE_BREAK_TAG_PATTERN, '\n')
    .replace(BLOCK_START_AFTER_TEXT_PATTERN, '$1\n$2')
    .replace(CLOSING_BLOCK_TAG_PATTERN, '\n')
    .replace(TAG_PATTERN, '')
    .replace(EDITABLE_HTML_ENTITY_PATTERN, decodeHtmlEntity)
    .replace(TRAILING_LINE_BREAKS_PATTERN, '');

const REMOTE_IMAGE_PATTERN = /<img\b[^>]*\ssrc\s*=\s*["']https?:/i;
const OPENING_MARKUP_PATTERN = /^(?:<!doctype\s|<!--|<\?|<[a-z][a-z0-9]*(?:\s[^>]*)?\/?>)/i;
const EMBEDDED_MARKUP_PATTERN = /<\/[a-z][a-z0-9]*\s*>|<(?:br|hr|img|p|div|table|tr|td|ul|ol|li)\b[^>]*>/i;
const LEADING_BLANKS_PATTERN = /^[\s\uFEFF\u200B]+/;

/**
 * Tells whether the body of a message was written as markup. The envelope of an encrypted message
 * carries a single body and says nothing about its format, so the only way to know is to look at
 * it: `mail-web` writes markup there, and the mobile compose writes plain text. A body that opens
 * with a tag is markup, and so is one that carries a closing or a standalone tag further in, which
 * is what a message that opens with a line of text looks like.
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

/**
 * Tells whether a body would fetch images from outside the message to display itself.
 *
 * @param bodyHtml the markup of the message, already safe to display
 * @returns true when at least one image is hosted somewhere else
 */
export const hasRemoteImages = (bodyHtml: string): boolean => REMOTE_IMAGE_PATTERN.test(bodyHtml);
