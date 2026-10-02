import { completeLinkUrl, unwrapEditorHtml } from './composeBodyHtml';

describe('Reading the body the editor holds', () => {
  test('when the editor gives back a body, then it comes without the wrapper and its surrounding line breaks', () => {
    expect(unwrapEditorHtml('<html>\n<ul>\n<li>first</li>\n</ul>\n<p>bye</p>\n</html>')).toBe(
      '<ul>\n<li>first</li>\n</ul>\n<p>bye</p>',
    );
  });

  test('when a body is not wrapped, then it comes back as it is', () => {
    expect(unwrapEditorHtml('<p>Hello</p>')).toBe('<p>Hello</p>');
  });
});

describe('Reading the address typed for a link', () => {
  test('when the address names no scheme, then the link points to it over a secure connection', () => {
    expect(completeLinkUrl('  internxt.com/pricing ')).toBe('https://internxt.com/pricing');
    expect(completeLinkUrl('internxt.com:8080/pricing')).toBe('https://internxt.com:8080/pricing');
  });

  test('when the address is a web or mail address with its scheme, then it keeps that scheme', () => {
    expect(completeLinkUrl('http://example.com/page')).toBe('http://example.com/page');
    expect(completeLinkUrl('mailto:hello@inxt.me')).toBe('mailto:hello@inxt.me');
  });

  test('when the address runs code or opens something other than a web page or a mail, then no link is made', () => {
    expect(completeLinkUrl('javascript:alert(1)')).toBe('');
    expect(completeLinkUrl('file:///etc/passwd')).toBe('');
  });

  test('when nothing was typed, then no link is made', () => {
    expect(completeLinkUrl('   ')).toBe('');
  });

  test('when the address cannot be read as an address, then no link is made', () => {
    expect(completeLinkUrl('https://')).toBe('');
    expect(completeLinkUrl('hello there')).toBe('');
  });

  test('when a web address carries quotes, angle brackets or spaces, then they are encoded so they cannot break out of the link', () => {
    expect(completeLinkUrl('https://a.com/" onmouseover="alert(1)')).toBe(
      'https://a.com/%22%20onmouseover=%22alert(1)',
    );
    expect(completeLinkUrl('a.com/<b>page</b>')).toBe('https://a.com/%3Cb%3Epage%3C/b%3E');
  });

  test('when a web address is already encoded, then it is not encoded twice', () => {
    expect(completeLinkUrl('https://es.wikipedia.org/wiki/Espa%C3%B1a')).toBe(
      'https://es.wikipedia.org/wiki/Espa%C3%B1a',
    );
  });

  test('when a mail address carries quotes or angle brackets, then no link is made', () => {
    expect(completeLinkUrl('mailto:a" onmouseover="x@inxt.me')).toBe('');
  });
});
