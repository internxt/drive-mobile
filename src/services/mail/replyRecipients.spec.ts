import { deriveReplyRecipients, hasSameAddresses, RepliedMessage } from './replyRecipients';

const SELF = 'me@inxt.eu';

const buildMessage = (source: Partial<RepliedMessage>): RepliedMessage => ({
  from: [],
  replyTo: [],
  to: [],
  cc: [],
  ...source,
});

const emails = (recipients: { email: string }[]): string[] => recipients.map((recipient) => recipient.email);

describe('Working out who a reply is addressed to', () => {
  test('when replying to a message, then it is addressed to whoever sent it', () => {
    const source = buildMessage({ from: [{ email: 'sender@inxt.eu' }] });

    const { to, cc } = deriveReplyRecipients(source, SELF, false);

    expect(emails(to)).toEqual(['sender@inxt.eu']);
    expect(cc).toEqual([]);
  });

  test('when the original asks for replies to go somewhere else, then it is addressed there instead of to the sender', () => {
    const source = buildMessage({
      from: [{ email: 'sender@inxt.eu' }],
      replyTo: [{ email: 'answers@inxt.eu' }],
    });

    const { to } = deriveReplyRecipients(source, SELF, false);

    expect(emails(to)).toEqual(['answers@inxt.eu']);
  });

  test('when replying to only the sender, then the other participants are left out', () => {
    const source = buildMessage({
      from: [{ email: 'sender@inxt.eu' }],
      to: [{ email: 'someone@inxt.eu' }],
      cc: [{ email: 'watching@inxt.eu' }],
    });

    const { cc } = deriveReplyRecipients(source, SELF, false);

    expect(cc).toEqual([]);
  });

  test('when replying to everybody, then the other participants travel in copy', () => {
    const source = buildMessage({
      from: [{ email: 'sender@inxt.eu' }],
      to: [{ email: 'someone@inxt.eu' }],
      cc: [{ email: 'watching@inxt.eu' }],
    });

    const { to, cc } = deriveReplyRecipients(source, SELF, true);

    expect(emails(to)).toEqual(['sender@inxt.eu']);
    expect(emails(cc)).toEqual(['someone@inxt.eu', 'watching@inxt.eu']);
  });

  test('when replying to everybody, then whoever is replying is not put in copy of their own message', () => {
    const source = buildMessage({
      from: [{ email: 'sender@inxt.eu' }],
      to: [{ email: SELF }, { email: 'someone@inxt.eu' }],
    });

    const { cc } = deriveReplyRecipients(source, SELF, true);

    expect(emails(cc)).toEqual(['someone@inxt.eu']);
  });

  test('when replying to everybody, then whoever already receives the reply is not also put in copy', () => {
    const source = buildMessage({
      from: [{ email: 'sender@inxt.eu' }],
      cc: [{ email: 'sender@inxt.eu' }, { email: 'someone@inxt.eu' }],
    });

    const { to, cc } = deriveReplyRecipients(source, SELF, true);

    expect(emails(to)).toEqual(['sender@inxt.eu']);
    expect(emails(cc)).toEqual(['someone@inxt.eu']);
  });

  test('when the same address is written in different casing or with spare spaces, then it is kept once', () => {
    const source = buildMessage({
      from: [{ email: 'sender@inxt.eu' }],
      to: [{ email: 'Someone@Inxt.eu' }, { email: ' someone@inxt.eu ' }],
      cc: [{ email: 'SOMEONE@INXT.EU' }],
    });

    const { cc } = deriveReplyRecipients(source, SELF, true);

    expect(emails(cc)).toEqual(['Someone@Inxt.eu']);
  });

  test('when whoever is replying wrote the original and nobody else took part, then nobody is put in copy', () => {
    const source = buildMessage({
      from: [{ email: 'sender@inxt.eu' }],
      to: [{ email: SELF }],
    });

    const { to, cc } = deriveReplyRecipients(source, SELF, true);

    expect(emails(to)).toEqual(['sender@inxt.eu']);
    expect(cc).toEqual([]);
  });

  test('when the address of whoever is replying is written in different casing, then they are still left out of copy', () => {
    const source = buildMessage({
      from: [{ email: 'sender@inxt.eu' }],
      to: [{ email: 'ME@INXT.EU' }, { email: 'someone@inxt.eu' }],
    });

    const { cc } = deriveReplyRecipients(source, SELF, true);

    expect(emails(cc)).toEqual(['someone@inxt.eu']);
  });

  test('when the original carries display names, then they travel with the addresses', () => {
    const source = buildMessage({
      from: [{ name: 'The Sender', email: 'sender@inxt.eu' }],
      to: [{ name: 'Someone', email: 'someone@inxt.eu' }],
    });

    const { to, cc } = deriveReplyRecipients(source, SELF, true);

    expect(to).toEqual([{ name: 'The Sender', email: 'sender@inxt.eu' }]);
    expect(cc).toEqual([{ name: 'Someone', email: 'someone@inxt.eu' }]);
  });
});


describe('Telling whether two lists name the same people', () => {
  test('when both lists hold the same addresses in a different order, then they name the same people', () => {
    expect(hasSameAddresses(['one@inxt.eu', 'two@inxt.eu'], ['two@inxt.eu', 'one@inxt.eu'])).toBe(true);
  });

  test('when the same address is written in a different case, then it still names the same person', () => {
    expect(hasSameAddresses(['Ada@Inxt.eu'], ['ada@inxt.eu'])).toBe(true);
  });

  test('when an address is written with spaces around it, then it still names the same person', () => {
    expect(hasSameAddresses([' ada@inxt.eu '], ['ada@inxt.eu'])).toBe(true);
  });

  test('when one list repeats an address the other one does not hold, then they name different people', () => {
    expect(hasSameAddresses(['one@inxt.eu', 'one@inxt.eu'], ['one@inxt.eu', 'two@inxt.eu'])).toBe(false);
  });

  test('when a list only repeats what it already holds, then both still name the same people', () => {
    expect(hasSameAddresses(['one@inxt.eu', 'one@inxt.eu'], ['one@inxt.eu'])).toBe(true);
  });

  test('when one list holds somebody the other one does not, then they name different people', () => {
    expect(hasSameAddresses(['one@inxt.eu'], ['one@inxt.eu', 'two@inxt.eu'])).toBe(false);
  });

  test('when the addresses of each list join into the same text, then they are still told apart', () => {
    expect(hasSameAddresses(['ab@inxt.eu'], ['a@inxt.eu', 'b@inxt.eu'])).toBe(false);
  });

  test('when both lists are empty, then they name the same people', () => {
    expect(hasSameAddresses([], [])).toBe(true);
  });
});
