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

const REMOTE_IMAGE_PATTERN = /<img\b[^>]*\ssrc\s*=\s*["']https?:/i;

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
      return { content: source.text, isHtml: false };
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
export const plainTextToHtml = (text: string): string => {
  const escapedText = text.replace(/[&<>"']/g, (character) => HTML_ENTITY_BY_CHARACTER[character]);
  return `<div style="white-space:pre-wrap">${escapedText}</div>`;
};

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
