const EDITOR_HTML_PATTERN = /^<html>\s*([\s\S]*?)\s*<\/html>$/;

/** Removes the outer `<html>` element and the blank space around its content; anything else comes back unchanged. */
export const unwrapEditorHtml = (editorHtml: string): string =>
  editorHtml.match(EDITOR_HTML_PATTERN)?.[1] ?? editorHtml;

const ONLY_EMPTY_PARAGRAPHS_PATTERN = /^(?:\s*<p>\s*<\/p>\s*)+$/;
const BLANK_SPACE_PATTERN = /\s/g;
// Workaround for a bug of react-native-enriched-html 1.1.1 on iOS: it shows a value shorter than this as
// plain text, tags included, instead of reading it as markup.
const SHORTEST_BODY_IOS_READS_AS_MARKUP = 13;

/**
 * Returns the value the editor starts with for a saved body: an empty string when the body is blank or
 * made only of empty paragraphs, the body inside a `div` when it is shorter than
 * `SHORTEST_BODY_IOS_READS_AS_MARKUP`, and the body itself otherwise.
 */
export const toEditorInitialBody = (body: string): string => {
  const bodyWithoutBlankSpace = body.replace(BLANK_SPACE_PATTERN, '');
  if (bodyWithoutBlankSpace.length === 0 || ONLY_EMPTY_PARAGRAPHS_PATTERN.test(body)) {
    return '';
  }
  if (bodyWithoutBlankSpace.length < SHORTEST_BODY_IOS_READS_AS_MARKUP) {
    return `<div>${body}</div>`;
  }

  return body;
};

const URL_SCHEME_PATTERN = /^[a-z][a-z0-9+-]*:/i;
const ALLOWED_LINK_PROTOCOLS = ['http:', 'https:', 'mailto:'];
const LINK_BREAKING_CHARACTER_PATTERN = /["<>\s]/;

/**
 * Trims the address, puts `https://` in front when it has no scheme and returns it as `URL` serializes it.
 * Returns an empty string when it is empty or not a valid URL, when its scheme is not http, https or
 * mailto, or when it still holds quotes, angle brackets or blank space.
 */
export const completeLinkUrl = (typedUrl: string): string => {
  const trimmedUrl = typedUrl.trim();
  if (!trimmedUrl) {
    return '';
  }
  try {
    const { href, protocol } = new URL(URL_SCHEME_PATTERN.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`);
    return ALLOWED_LINK_PROTOCOLS.includes(protocol) && !LINK_BREAKING_CHARACTER_PATTERN.test(href) ? href : '';
  } catch {
    return '';
  }
};
