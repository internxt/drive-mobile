import { EmailResponse } from '@internxt/sdk/dist/mail/types';
import { DomUtils, parseDocument } from 'htmlparser2';

import {
  buildEmailBodyHtml,
  plainTextFromHtml,
  plainTextToHtml,
  resolveEmailBody,
  type EmailBodySource,
} from './emailBodyContent';
import { sanitizeMailHtml } from './sanitizeMailHtml';

type DomNode = ReturnType<typeof parseDocument>['children'][number];
type DomElement = Extract<DomNode, { attribs: Record<string, string> }>;

const QUOTE_CONTAINER_CLASS_NAMES = ['gmail_quote', 'yahoo_quoted', 'protonmail_quote'];
const QUOTE_HEADING_CLASS_NAME = 'moz-cite-prefix';
const QUOTED_REPLY_HEADER_IDS = ['appendonsend', 'divRplyFwdMsg'];
const CITED_BLOCKQUOTE_TYPE = 'cite';

const QUOTED_LINE_PATTERN = /^\s*>/;
const QUOTE_ATTRIBUTION_PATTERN = /^\s*(on|el)\s.+\s(wrote|escribió):\s*$/i;
const QUOTE_ATTRIBUTION_START_PATTERN = /^\s*(on|el)\s/i;
const QUOTE_ATTRIBUTION_END_PATTERN = /(wrote|escribió):\s*$/i;

export type EmailBodyParts = {
  fullHtml: string;
  htmlWithoutQuote: string | null;
};

const hasClassName = (element: DomElement, className: string): boolean =>
  (element.attribs.class ?? '').split(/\s+/).includes(className);

const isQuoteContainer = (element: DomElement): boolean =>
  (element.name === 'blockquote' && element.attribs.type === CITED_BLOCKQUOTE_TYPE) ||
  QUOTE_CONTAINER_CLASS_NAMES.some((className) => hasClassName(element, className));

const isQuotedReplyHeader = (element: DomElement): boolean =>
  QUOTED_REPLY_HEADER_IDS.includes(element.attribs.id ?? '');

const readTextAfter = (node: DomNode): string => {
  const textParts: string[] = [];
  let current: DomNode | null = node;
  while (current) {
    let sibling = current.next;
    while (sibling) {
      textParts.push(DomUtils.textContent(sibling));
      sibling = sibling.next;
    }
    current = current.parent as DomNode | null;
  }
  return textParts.join('');
};

const removeFromNodeToEnd = (node: DomNode) => {
  let current: DomNode | null = node;
  while (current) {
    while (current.next) {
      DomUtils.removeElement(current.next);
    }
    current = current.parent as DomNode | null;
  }
  DomUtils.removeElement(node);
};

const findQuoteStart = (nodes: DomNode[]): DomNode | null => {
  const quotedReplyHeader = DomUtils.findOne(isQuotedReplyHeader, nodes, true);
  if (quotedReplyHeader) {
    return quotedReplyHeader;
  }

  const trailingContainer = DomUtils.findAll(isQuoteContainer, nodes).find(
    (container) => readTextAfter(container).trim().length === 0,
  );
  if (!trailingContainer) {
    return null;
  }

  const previousElement = DomUtils.prevElementSibling(trailingContainer);
  return previousElement && hasClassName(previousElement, QUOTE_HEADING_CLASS_NAME)
    ? previousElement
    : trailingContainer;
};

const removeQuotedHtml = (html: string): string | null => {
  const document = parseDocument(html);
  const quoteStart = findQuoteStart(document.children);
  if (!quoteStart) {
    return null;
  }
  removeFromNodeToEnd(quoteStart);
  return sanitizeMailHtml(DomUtils.getOuterHTML(document));
};

const countAttributionLines = (lines: string[], lineIndex: number): number => {
  if (QUOTE_ATTRIBUTION_PATTERN.test(lines[lineIndex])) {
    return 1;
  }
  const isSplitOverTwoLines =
    QUOTE_ATTRIBUTION_START_PATTERN.test(lines[lineIndex]) &&
    lineIndex + 1 < lines.length &&
    QUOTE_ATTRIBUTION_END_PATTERN.test(lines[lineIndex + 1]);
  return isSplitOverTwoLines ? 2 : 0;
};

const removeQuotedPlainText = (text: string): string | null => {
  const lines = text.split('\n');
  const isQuotedToTheEnd = new Array<boolean>(lines.length + 1).fill(false);
  const hasQuotedLineAfter = new Array<boolean>(lines.length + 1).fill(false);
  isQuotedToTheEnd[lines.length] = true;

  for (let lineIndex = lines.length - 1; lineIndex >= 0; lineIndex--) {
    const line = lines[lineIndex];
    const isBlank = line.trim().length === 0;
    const isQuoted = QUOTED_LINE_PATTERN.test(line);
    isQuotedToTheEnd[lineIndex] = isQuotedToTheEnd[lineIndex + 1] && (isBlank || isQuoted);
    hasQuotedLineAfter[lineIndex] = hasQuotedLineAfter[lineIndex + 1] || isQuoted;
  }

  const quoteStartIndex = lines.findIndex((line, lineIndex) => {
    if (QUOTED_LINE_PATTERN.test(line)) {
      return isQuotedToTheEnd[lineIndex];
    }
    const attributionLineCount = countAttributionLines(lines, lineIndex);
    const quoteIndex = lineIndex + attributionLineCount;
    return attributionLineCount > 0 && isQuotedToTheEnd[quoteIndex] && hasQuotedLineAfter[quoteIndex];
  });

  return quoteStartIndex === -1 ? null : lines.slice(0, quoteStartIndex).join('\n').trimEnd();
};

/**
 * Builds the displayable markup of a message twice: whole, and without the text it quotes from earlier
 * messages at its end. The second one is `null` when the message quotes nothing at its end, or when leaving
 * the quote out would leave nothing to show.
 */
export const buildEmailBodyParts = (message: EmailResponse, source: EmailBodySource): EmailBodyParts => {
  const { content, isHtml } = resolveEmailBody(message, source);
  const fullHtml = buildEmailBodyHtml(message, source);

  const contentWithoutQuote = isHtml ? removeQuotedHtml(content) : removeQuotedPlainText(content);
  if (contentWithoutQuote === null) {
    return { fullHtml, htmlWithoutQuote: null };
  }

  const htmlWithoutQuote = isHtml ? contentWithoutQuote : plainTextToHtml(contentWithoutQuote);
  const hasTextLeft = plainTextFromHtml(htmlWithoutQuote).length > 0;
  return { fullHtml, htmlWithoutQuote: hasTextLeft ? htmlWithoutQuote : null };
};
