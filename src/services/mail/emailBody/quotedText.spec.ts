import { EmailResponse } from '@internxt/sdk/dist/mail/types';

import { buildEmailBodyParts } from './quotedText';

const PLAIN_SOURCE = { type: 'plain' } as const;

const htmlMessage = (htmlBody: string): EmailResponse => ({ htmlBody, textBody: null }) as unknown as EmailResponse;
const textMessage = (textBody: string): EmailResponse => ({ htmlBody: null, textBody }) as unknown as EmailResponse;

describe('Separating what a message says from what it quotes', () => {
  test('when a reply quotes the previous message the way Gmail does, then the quote and its heading are left out', () => {
    const message = htmlMessage(
      '<div>Thanks, I will listen to it</div><div class="gmail_quote"><div class="gmail_attr">On Sep 21, Alex wrote:</div><blockquote class="gmail_quote">Check this episode</blockquote></div>',
    );

    const { htmlWithoutQuote, fullHtml } = buildEmailBodyParts(message, PLAIN_SOURCE);

    expect(htmlWithoutQuote).toContain('Thanks, I will listen to it');
    expect(htmlWithoutQuote).not.toContain('Check this episode');
    expect(htmlWithoutQuote).not.toContain('Alex wrote');
    expect(fullHtml).toContain('Check this episode');
  });

  test('when a reply quotes the previous message the way Apple Mail does, then the quote is left out', () => {
    const message = htmlMessage('<p>Sounds good</p><blockquote type="cite">The original text</blockquote>');

    const { htmlWithoutQuote } = buildEmailBodyParts(message, PLAIN_SOURCE);

    expect(htmlWithoutQuote).toContain('Sounds good');
    expect(htmlWithoutQuote).not.toContain('The original text');
  });

  test('when a reply from Outlook carries the original message after its header, then the original message is left out too', () => {
    const message = htmlMessage(
      '<div>My answer</div><div id="appendonsend"></div><hr><div id="divRplyFwdMsg"><b>From:</b> Alex<br><b>Sent:</b> Monday</div><div>The original message</div>',
    );

    const { htmlWithoutQuote } = buildEmailBodyParts(message, PLAIN_SOURCE);

    expect(htmlWithoutQuote).toContain('My answer');
    expect(htmlWithoutQuote).not.toContain('Alex');
    expect(htmlWithoutQuote).not.toContain('The original message');
  });

  test('when a reply from Thunderbird puts the heading of the quote above it, then the heading is left out too', () => {
    const message = htmlMessage(
      '<p>Fine by me</p><div class="moz-cite-prefix">On 9/21/26 Alex wrote:<br></div><blockquote type="cite">Shall we meet?</blockquote>',
    );

    const { htmlWithoutQuote } = buildEmailBodyParts(message, PLAIN_SOURCE);

    expect(htmlWithoutQuote).toContain('Fine by me');
    expect(htmlWithoutQuote).not.toContain('Alex wrote');
    expect(htmlWithoutQuote).not.toContain('Shall we meet?');
  });

  test('when the writer highlights a passage as a quote in the middle of the message, then nothing is hidden', () => {
    const message = htmlMessage('<p>I think:</p><blockquote>The deadline is Friday</blockquote><p>Let me know.</p>');

    expect(buildEmailBodyParts(message, PLAIN_SOURCE).htmlWithoutQuote).toBeNull();
  });

  test('when an HTML reply answers between the quoted parts, then nothing is hidden', () => {
    const message = htmlMessage(
      '<blockquote type="cite">First question</blockquote><p>First answer</p><blockquote type="cite">Second question</blockquote><p>Second answer</p>',
    );

    expect(buildEmailBodyParts(message, PLAIN_SOURCE).htmlWithoutQuote).toBeNull();
  });

  test('when the markup of the message is shown without the quote, then nothing unsafe gets through', () => {
    const message = htmlMessage(
      '<p class="note" onclick="steal()">Hi</p><script>steal()</script><blockquote type="cite">Quoted</blockquote>',
    );

    expect(buildEmailBodyParts(message, PLAIN_SOURCE).htmlWithoutQuote).toBe('<p>Hi</p>');
  });

  test('when a plain text reply ends with the quoted lines of the previous message, then those lines are left out', () => {
    const message = textMessage('Thanks!\n\nOn Sep 21, Alex wrote:\n> Check this episode\n> It is good');

    const { htmlWithoutQuote } = buildEmailBodyParts(message, PLAIN_SOURCE);

    expect(htmlWithoutQuote).toContain('Thanks!');
    expect(htmlWithoutQuote).not.toContain('Check this episode');
    expect(htmlWithoutQuote).not.toContain('Alex wrote');
  });

  test('when a plain text reply is written in Spanish, then the Spanish heading of the quote is left out too', () => {
    const message = textMessage('Gracias\n\nEl 21 sep, a las 17:38, Alex escribió:\n> Mira este episodio');

    const { htmlWithoutQuote } = buildEmailBodyParts(message, PLAIN_SOURCE);

    expect(htmlWithoutQuote).toContain('Gracias');
    expect(htmlWithoutQuote).not.toContain('Alex escribió');
    expect(htmlWithoutQuote).not.toContain('Mira este episodio');
  });

  test('when the heading of a plain text quote is split over two lines, then neither line is shown', () => {
    const message = textMessage('Thanks\n\nOn Mon, Sep 21, 2026 at 5:38 PM Alex <alex@inxt.eu>\nwrote:\n> Check this');

    const { htmlWithoutQuote } = buildEmailBodyParts(message, PLAIN_SOURCE);

    expect(htmlWithoutQuote).toContain('Thanks');
    expect(htmlWithoutQuote).not.toContain('Sep 21');
    expect(htmlWithoutQuote).not.toContain('wrote');
  });

  test('when a plain text reply uses Windows line endings, then the quote is still recognised', () => {
    const message = textMessage('Thanks\r\n\r\nOn Sep 21, Alex wrote:\r\n> Check this\r\n');

    expect(buildEmailBodyParts(message, PLAIN_SOURCE).htmlWithoutQuote).not.toContain('Check this');
  });

  test('when a plain text reply answers between quoted lines, then nothing is hidden', () => {
    const message = textMessage('> First question\nFirst answer\n> Second question\nSecond answer');

    expect(buildEmailBodyParts(message, PLAIN_SOURCE).htmlWithoutQuote).toBeNull();
  });

  test('when the message quotes nothing, then there is no version without a quote', () => {
    expect(buildEmailBodyParts(htmlMessage('<p>Just a message</p>'), PLAIN_SOURCE).htmlWithoutQuote).toBeNull();
    expect(buildEmailBodyParts(textMessage('Just a message'), PLAIN_SOURCE).htmlWithoutQuote).toBeNull();
  });

  test('when the message is nothing but a quote, then the quote is not hidden', () => {
    const onlyQuoteHtml = htmlMessage('<blockquote type="cite">Only this</blockquote>');

    expect(buildEmailBodyParts(onlyQuoteHtml, PLAIN_SOURCE).htmlWithoutQuote).toBeNull();
    expect(buildEmailBodyParts(textMessage('> Only this'), PLAIN_SOURCE).htmlWithoutQuote).toBeNull();
  });

  test('when the message was decrypted, then its decrypted body is the one that is split', () => {
    const decryptedSource = {
      type: 'decrypted',
      text: '<p>Reply</p><blockquote type="cite">Earlier</blockquote>',
    } as const;

    expect(buildEmailBodyParts(htmlMessage(''), decryptedSource).htmlWithoutQuote).toBe('<p>Reply</p>');
  });

  test('when a long mailing list message ends with a long quote, then it is split quickly', () => {
    const quotedLines = Array.from({ length: 20000 }, (_, index) => `> quoted line ${index}`);
    const message = textMessage(['Short answer', 'On Monday, Alex wrote:', ...quotedLines].join('\n'));
    const MAX_SPLIT_DURATION_MS = 500;

    const startedAt = Date.now();
    const { htmlWithoutQuote } = buildEmailBodyParts(message, PLAIN_SOURCE);

    expect(Date.now() - startedAt).toBeLessThan(MAX_SPLIT_DURATION_MS);
    expect(htmlWithoutQuote).not.toContain('quoted line');
  });
});
