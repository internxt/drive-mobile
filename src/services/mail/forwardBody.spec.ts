import { EmailResponse } from '@internxt/sdk/dist/mail/types';

import { buildForwardedQuote, composeForwardedBody, forwardedSubject, previewOfForward } from './forwardBody';

const anEmail = (fields: Partial<EmailResponse>): EmailResponse =>
  ({
    from: [{ email: 'writer@inxt.me', name: 'The Writer' }],
    to: [{ email: 'reader@inxt.me' }],
    subject: 'The offer',
    sentAt: '2026-09-10T08:30:00.000Z',
    ...fields,
  }) as EmailResponse;

describe('Naming a forwarded message', () => {
  test('when a message is forwarded, then its subject says so', () => {
    expect(forwardedSubject('The offer')).toBe('Fwd: The offer');
  });

  test('when a message that was already forwarded is forwarded again, then the subject is left as it is', () => {
    expect(forwardedSubject('Fwd: The offer')).toBe('Fwd: The offer');
  });

  test('when the subject was forwarded with another casing, then it is still left as it is', () => {
    expect(forwardedSubject('FWD: The offer')).toBe('FWD: The offer');
  });
});

describe('Quoting the message being forwarded', () => {
  test('when the original is plain text, then it is quoted under a header that names who wrote it', () => {
    const quote = buildForwardedQuote(anEmail({}), { type: 'decrypted', text: 'Here are the numbers' });

    expect(quote.originalText).toBe('Here are the numbers');
    expect(quote.body).toContain('---------- Forwarded message ----------');
    expect(quote.body).toContain('Subject: The offer');
    expect(quote.body).toContain('Here are the numbers');
  });

  test('when the original is plain text, then the quote travels as markup, so nobody reads it flattened', () => {
    const quote = buildForwardedQuote(anEmail({}), {
      type: 'decrypted',
      text: 'Here are the numbers\nand the invoice',
    });

    expect(quote.body).toContain('<br>');
    expect(quote.body).toContain('white-space:pre-wrap');
    expect(quote.body).toContain('Here are the numbers\nand the invoice');
  });

  test('when the header names an address between angle brackets, then they travel written as markup means them', () => {
    const quote = buildForwardedQuote(anEmail({}), { type: 'decrypted', text: 'Here are the numbers' });

    expect(quote.body).toContain('From: The Writer &lt;writer@inxt.me&gt;');
    expect(quote.body).not.toContain('<writer@inxt.me>');
  });

  test('when the original is plain text naming an address between angle brackets, then the address is not read as markup and reaches the reader', () => {
    const quote = buildForwardedQuote(anEmail({}), {
      type: 'decrypted',
      text: 'Write to Ramon <ramon@inxt.eu> about it',
    });

    expect(quote.body).toContain('Write to Ramon &lt;ramon@inxt.eu&gt; about it');
  });

  test('when the original was written with formatting, then it travels with its formatting', () => {
    const quote = buildForwardedQuote(anEmail({}), {
      type: 'decrypted',
      text: '<table><tr><td>The numbers</td></tr></table>',
    });

    expect(quote.body).toContain('<table><tr><td>The numbers</td></tr></table>');
    expect(quote.body).toContain('---------- Forwarded message ----------');
  });

  test('when the original has nobody in copy, then the header says nothing about copies', () => {
    const quote = buildForwardedQuote(anEmail({ cc: [] }), { type: 'decrypted', text: 'Here are the numbers' });

    expect(quote.body).not.toContain('Cc:');
  });

  test('when the original has somebody in copy, then the header names them', () => {
    const quote = buildForwardedQuote(anEmail({ cc: [{ email: 'another@inxt.me' }] }), {
      type: 'decrypted',
      text: 'Here are the numbers',
    });

    expect(quote.body).toContain('Cc: another@inxt.me');
  });

  test('when the name of whoever wrote the original looks like markup, then it is shown as written', () => {
    const quote = buildForwardedQuote(anEmail({ from: [{ email: 'writer@inxt.me', name: '<b>The Writer</b>' }] }), {
      type: 'decrypted',
      text: '<p>Here are the numbers</p>',
    });

    expect(quote.body).toContain('&lt;b&gt;The Writer&lt;/b&gt;');
    expect(quote.body).not.toContain('<b>The Writer</b>');
  });
});

describe('Writing the body a forwarded message travels with', () => {
  const aQuote = { body: '<p>Quoted original</p>', originalText: 'Quoted original' };

  test('when the user wrote several lines above the quote, then the line breaks travel with them', () => {
    const body = composeForwardedBody('Take a look\nat this', aQuote);

    expect(body).toContain('white-space:pre-wrap');
    expect(body).toContain('Take a look\nat this');
    expect(body).toContain('<p>Quoted original</p>');
  });

  test('when what the user wrote looks like markup, then it is shown as written', () => {
    const body = composeForwardedBody('<script>stealTheKey()</script>', aQuote);

    expect(body).toContain('&lt;script&gt;');
    expect(body).not.toContain('<script>');
  });

  test('when the user wrote nothing above the quote, then the message is the quote alone', () => {
    expect(composeForwardedBody('   ', aQuote)).toBe('<p>Quoted original</p>');
  });
});

describe('Writing the opening of a forwarded message', () => {
  const aQuoteOf = (originalText: string) => ({ body: 'The whole quote', originalText });

  test('when the user wrote something above the quote, then that is what the mailbox list shows', () => {
    const preview = previewOfForward('  Take a look at this  ', aQuoteOf('Here are the numbers'));

    expect(preview).toBe('Take a look at this');
  });

  test('when the user wrote nothing, then the body of the original is shown instead of the header of the quote', () => {
    const preview = previewOfForward('', aQuoteOf('Here are the numbers'));

    expect(preview).toBe('Here are the numbers');
  });

  test('when the user wrote nothing and the original was formatted, then neither tags nor entities reach the list', () => {
    const quote = buildForwardedQuote(anEmail({}), {
      type: 'decrypted',
      text: '<p>Ana &lt;ana@inxt.me&gt; sent the numbers</p>',
    });

    expect(previewOfForward('', quote)).toBe('Ana <ana@inxt.me> sent the numbers');
  });

  test('when the user wrote nothing and the original is long, then the header of the quote does not take the whole row', () => {
    const quote = buildForwardedQuote(anEmail({ to: [{ email: 'reader@inxt.me' }, { email: 'another@inxt.me' }] }), {
      type: 'decrypted',
      text: 'Here are the numbers',
    });

    expect(previewOfForward('', quote)).toBe('Here are the numbers');
  });
});
