import sanitizeHtml from 'sanitize-html';

const MAIL_SANITISE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img'],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    '*': ['style'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel', 'cid'],
  allowProtocolRelative: false,
};

/**
 * Filters the body of an incoming email down to the markup that is safe to display: it keeps the
 * formatting and the inline attachment references, and drops scripts, event handlers and any link
 * whose scheme is not http, https, mailto, tel or cid.
 *
 * @param html the body of the email as it arrived, before rendering it
 * @returns the same body with everything unsafe removed
 */
export const sanitizeMailHtml = (html: string): string => sanitizeHtml(html, MAIL_SANITISE_OPTIONS);
