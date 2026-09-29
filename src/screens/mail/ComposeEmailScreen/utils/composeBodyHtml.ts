const EDITOR_HTML_PATTERN = /^<html>\s*([\s\S]*?)\s*<\/html>$/;

/** Removes the outer `<html>` element and the blank space around its content; anything else comes back unchanged. */
export const unwrapEditorHtml = (editorHtml: string): string =>
  editorHtml.match(EDITOR_HTML_PATTERN)?.[1] ?? editorHtml;

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
