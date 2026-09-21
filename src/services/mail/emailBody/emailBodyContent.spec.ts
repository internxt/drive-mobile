import { EmailResponse } from '@internxt/sdk/dist/mail/types';

import {
  buildEmailBodyHtml,
  editableTextFromHtml,
  isMarkupBody,
  plainTextFromHtml,
  plainTextToHtml,
  resolveEmailBody,
} from './emailBodyContent';

const anEmail = (fields: Partial<EmailResponse>): EmailResponse => ({ ...fields }) as EmailResponse;

describe('Choosing which body of a message to display', () => {
  test('when a message carries both a formatted and a plain version, then the formatted one is displayed', () => {
    const message = anEmail({ htmlBody: '<div style="color:red">An offer</div>', textBody: 'An offer' });

    expect(resolveEmailBody(message, { type: 'plain' })).toEqual({
      content: '<div style="color:red">An offer</div>',
      isHtml: true,
    });
  });

  test('when a message only carries a plain version, then that one is displayed', () => {
    const message = anEmail({ htmlBody: null, textBody: 'Just a few words' });

    expect(resolveEmailBody(message, { type: 'plain' })).toEqual({
      content: 'Just a few words',
      isHtml: false,
    });
  });

  test('when a message was encrypted and could be decrypted, then the decrypted body is displayed', () => {
    const message = anEmail({ htmlBody: null, textBody: 'an encrypted payload' });

    expect(resolveEmailBody(message, { type: 'decrypted', text: 'Hello there' })).toEqual({
      content: 'Hello there',
      isHtml: false,
    });
  });

  test('when a decrypted message was written with formatting, then it is displayed with that formatting', () => {
    const message = anEmail({ htmlBody: null, textBody: 'an encrypted payload' });

    expect(resolveEmailBody(message, { type: 'decrypted', text: '<p>Hello <b>there</b></p>' })).toEqual({
      content: '<p>Hello <b>there</b></p>',
      isHtml: true,
    });
  });

  test('when a message was encrypted and could not be decrypted, then nothing is displayed', () => {
    const message = anEmail({ htmlBody: '<p>An unreadable copy</p>', textBody: 'an encrypted payload' });

    expect(resolveEmailBody(message, { type: 'encryptedUnreadable' })).toEqual({
      content: '',
      isHtml: false,
    });
  });

  test('when a message has no body at all, then nothing is displayed', () => {
    const message = anEmail({ htmlBody: null, textBody: null });

    expect(resolveEmailBody(message, { type: 'plain' })).toEqual({
      content: '',
      isHtml: false,
    });
  });
});

describe('Displaying a message written as plain text', () => {
  test('when the text spans several lines, then the line breaks are kept', () => {
    const html = plainTextToHtml('First line\nSecond line');

    expect(html).toContain('white-space:pre-wrap');
    expect(html).toContain('First line\nSecond line');
  });

  test('when the text contains characters that look like markup, then they are shown as written', () => {
    const html = plainTextToHtml('a < b && c > d');

    expect(html).toContain('a &lt; b &amp;&amp; c &gt; d');
  });

  test('when the text has apostrophes and quotation marks, then they are shown without anything added around them', () => {
    const html = plainTextToHtml('it\'s the "big" one, isn\'t it?');

    expect(html).toContain('it&#39;s the &quot;big&quot; one, isn&#39;t it?');
  });

  test('when the text looks like a script, then it is shown as text instead of being rendered', () => {
    const html = plainTextToHtml('<script>stealTheKey()</script>');

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('Preparing the body of a message for the screen', () => {
  test('when a message carries formatted content with a script in it, then the formatting is kept and the script is not', () => {
    const message = anEmail({ htmlBody: '<div style="color:red">An offer</div><script>stealTheKey()</script>' });

    const bodyHtml = buildEmailBodyHtml(message, { type: 'plain' });

    expect(bodyHtml).toContain('<div style="color:red">An offer</div>');
    expect(bodyHtml).not.toContain('stealTheKey');
  });

  test('when a message carries a link that would run something, then the link is stripped of it', () => {
    const message = anEmail({ htmlBody: '<a href="javascript:stealTheKey()">Click here</a>' });

    expect(buildEmailBodyHtml(message, { type: 'plain' })).not.toContain('javascript');
  });

  test('when a message is plain text that looks like markup, then it is shown as written instead of being rendered', () => {
    const message = anEmail({ htmlBody: null, textBody: '<script>stealTheKey()</script>' });

    const bodyHtml = buildEmailBodyHtml(message, { type: 'plain' });

    expect(bodyHtml).toContain('&lt;script&gt;');
    expect(bodyHtml).not.toContain('<script>');
  });

  test('when a decrypted message contains characters that look like markup, then they are shown as written', () => {
    const message = anEmail({ htmlBody: null, textBody: 'an encrypted payload' });

    const bodyHtml = buildEmailBodyHtml(message, { type: 'decrypted', text: '5 < 7' });

    expect(bodyHtml).toContain('5 &lt; 7');
  });
});

describe('Telling whether a decrypted body was written with formatting', () => {
  test('when the body opens with a tag, then it is read as formatted', () => {
    expect(isMarkupBody('<p>Hello there</p>')).toBe(true);
  });

  test('when the body opens with blank space before its first tag, then it is still read as formatted', () => {
    expect(isMarkupBody('\n  <div>Hello there</div>')).toBe(true);
  });

  test('when the body is a whole document, then it is read as formatted', () => {
    expect(isMarkupBody('<!DOCTYPE html><html><body>Hello there</body></html>')).toBe(true);
  });

  test('when the body carries a closing tag, then it is read as formatted', () => {
    expect(isMarkupBody('Here are the numbers</p>')).toBe(true);
  });

  test('when the body is plain text, then it is not read as formatted', () => {
    expect(isMarkupBody('Hello there')).toBe(false);
  });

  test('when the body is plain text that opens with a comparison, then it is not read as formatted', () => {
    expect(isMarkupBody('5 < 7 is true')).toBe(false);
  });

  test('when the body opens with a line of text before its first tag, then it is read as formatted', () => {
    expect(isMarkupBody('Hi there<br>Here are the numbers')).toBe(true);
  });

  test('when the body opens with a comment, then it is read as formatted', () => {
    expect(isMarkupBody('<!-- written elsewhere --><p>Here are the numbers</p>')).toBe(true);
  });

  test('when the body opens with a character the editor left in front of its markup, then it is read as formatted', () => {
    expect(isMarkupBody('\uFEFF<p>Here are the numbers</p>')).toBe(true);
  });

  test('when the body is plain text that names a tag in passing, then it is not read as formatted', () => {
    expect(isMarkupBody('Use the <whatever element for this')).toBe(false);
  });

  test('when the body is plain text with arrows in it, then it is not read as formatted', () => {
    expect(isMarkupBody('a -> b, and 5 < 7 > 3')).toBe(false);
  });

  test('when the body is empty, then it is not read as formatted', () => {
    expect(isMarkupBody('')).toBe(false);
  });
});

describe('Reading a formatted body as the text it displays', () => {
  test('when the body has tags, then only the text between them is left', () => {
    expect(plainTextFromHtml('<p>Here are <b>the numbers</b></p>')).toBe('Here are the numbers');
  });

  test('when the body has characters written as entities, then they are read as the characters they stand for', () => {
    expect(plainTextFromHtml('<div>Ana &lt;ana@inxt.me&gt; &amp; Bea</div>')).toBe('Ana <ana@inxt.me> & Bea');
  });

  test('when the body holds blank space of its own, then it is collapsed the way a browser collapses it', () => {
    expect(plainTextFromHtml('<p>Here are</p>\n\n   <p>the numbers</p>')).toBe('Here are the numbers');
  });

  test('when the body separates words only with tags, then the words do not end up stuck together', () => {
    expect(plainTextFromHtml('<td>Invoice</td><td>September</td>')).toBe('Invoice September');
  });

  test('when the body holds a space written as an entity, then it is read as a space', () => {
    expect(plainTextFromHtml('<p>Invoice&nbsp;September</p>')).toBe('Invoice September');
  });
});

describe('Reading a formatted body back as text to keep editing', () => {
  test('when a body written on the phone is read back, then it comes back exactly as it was typed', () => {
    const typedText = 'Hello\n\nsee you <soon> & bye';

    expect(editableTextFromHtml(plainTextToHtml(typedText))).toBe(typedText);
  });

  test('when a body written in paragraphs is read back, then each paragraph becomes a line', () => {
    expect(editableTextFromHtml('<p>Hello</p><p>see you</p>')).toBe('Hello\nsee you');
  });

  test('when a body has line break tags, then each one becomes a line break', () => {
    expect(editableTextFromHtml('Hello<br>see you<br/>bye')).toBe('Hello\nsee you\nbye');
  });

  test('when a body has formatting, then the formatting is dropped and its text is kept', () => {
    expect(editableTextFromHtml('<p>Hello <b>there</b></p>')).toBe('Hello there');
  });

  test('when a body written in the browser has an empty paragraph, then it becomes a single blank line', () => {
    expect(editableTextFromHtml('<p>Hello</p><p><br></p><p>bye</p>')).toBe('Hello\n\nbye');
  });

  test('when the markup of a body is spread over several lines, then those lines do not add blank lines', () => {
    expect(editableTextFromHtml('<p>Hello</p>\n<p>see you</p>')).toBe('Hello\nsee you');
  });

  test('when a body carries styles or scripts, then none of their code ends up in the text', () => {
    expect(editableTextFromHtml('<style>p{color:red}</style><p>Hi</p><script>run()</script>')).toBe('Hi');
  });

  test('when a body writes characters by their number, then they are read as those characters', () => {
    expect(editableTextFromHtml('<p>it&#x27;s&#160;fine &#169;</p>')).toBe('it\'s fine \u00a9');
  });

  test('when a body nests blocks inside text, then each block starts on its own line', () => {
    expect(editableTextFromHtml('<div>Hello<div>world</div></div>')).toBe('Hello\nworld');
    expect(editableTextFromHtml('<ul><li>first<ul><li>second</li></ul></li></ul>')).toBe('first\nsecond');
  });
});
