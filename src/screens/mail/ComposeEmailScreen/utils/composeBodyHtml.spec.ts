import { completeLinkUrl, toEditorInitialBody, unwrapEditorHtml } from './composeBodyHtml';

describe('Reading the body the editor holds', () => {
  test('when the editor gives back a body, then it comes without the wrapper and its surrounding line breaks', () => {
    expect(unwrapEditorHtml('<html>\n<ul>\n<li>first</li>\n</ul>\n<p>bye</p>\n</html>')).toBe(
      '<ul>\n<li>first</li>\n</ul>\n<p>bye</p>',
    );
  });

  test('when a body is not wrapped, then it comes back as it is', () => {
    expect(unwrapEditorHtml('<p>Hello</p>')).toBe('<p>Hello</p>');
  });

  test.each([
    ['opens the wrapper and never closes it', '<html>\n<p>Hello</p>'],
    ['closes the wrapper without having opened it', '<p>Hello</p>\n</html>'],
  ])('when a body %s, then it comes back as it is', (_name, halfWrappedBody) => {
    expect(unwrapEditorHtml(halfWrappedBody)).toBe(halfWrappedBody);
  });
});

describe('Giving the editor the body it starts with', () => {
  test('when the saved body has nothing written, then the editor starts empty instead of showing its markup', () => {
    const bodiesWithNothingWritten = ['<p></p>', '<p></p><p></p>', '<p></p>\n<p> </p>\n', ' <p></p>'];

    expect(bodiesWithNothingWritten.map(toEditorInitialBody)).toEqual(['', '', '', '']);
  });

  test('when the saved body has something written, then the editor starts with it untouched', () => {
    const bodiesWithSomethingWritten = ['<p>Hello there</p>', '<p></p><p>Hello</p>'];

    expect(bodiesWithSomethingWritten.map(toEditorInitialBody)).toEqual(bodiesWithSomethingWritten);
  });

  test('when the saved body has many blank lines before its text, then the editor starts with it untouched', () => {
    const bodyWithManyBlankLines = `${'<p></p>\n'.repeat(200)}<p>Hello</p>`;

    expect(toEditorInitialBody(bodyWithManyBlankLines)).toBe(bodyWithManyBlankLines);
  });

  test('when the saved body is only a few characters long, then the editor gets it inside a wrapper it reads as markup', () => {
    const shortBodies = ['<p>hi</p>', '<p>hola</p>', '<p>h i</p>\n'];

    expect(shortBodies.map(toEditorInitialBody)).toEqual([
      '<div><p>hi</p></div>',
      '<div><p>hola</p></div>',
      '<div><p>h i</p>\n</div>',
    ]);
  });

  test('when the saved body is just long enough to be read as markup, then the editor starts with it untouched', () => {
    expect(toEditorInitialBody('<p>holaaa</p>')).toBe('<p>holaaa</p>');
  });

  test('when there is no saved body, then the editor starts empty', () => {
    expect(toEditorInitialBody('')).toBe('');
    expect(toEditorInitialBody(' \n')).toBe('');
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
