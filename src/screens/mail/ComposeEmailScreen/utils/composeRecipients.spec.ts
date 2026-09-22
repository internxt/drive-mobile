import {
  EMPTY_PENDING_RECIPIENT_TEXT,
  RecipientsByField,
  addEveryTypedRecipient,
  addRecipients,
  addTypedRecipients,
  canSendMessage,
  findUnreadableRecipientText,
  hasCopyOrBlindCopyRecipients,
  hasMainRecipient,
  isEndToEndEncrypted,
} from './composeRecipients';

const INTERNXT_ACTIVE_DOMAINS = [{ domain: 'inxt.me' }];

const recipientsByField = (recipients: Partial<RecipientsByField> = {}): RecipientsByField => ({
  to: [],
  cc: [],
  bcc: [],
  ...recipients,
});

describe('Keeping every address in a single recipient field', () => {
  test('when an address that is already a main recipient is added in copy, then it stays only as a main recipient', () => {
    const recipients = addRecipients(recipientsByField({ to: ['ada@inxt.me'] }), 'cc', ['ada@inxt.me']);

    expect(recipients).toEqual(recipientsByField({ to: ['ada@inxt.me'] }));
  });

  test('when an address that is in blind copy is added as a main recipient, then it leaves blind copy', () => {
    const recipients = addRecipients(recipientsByField({ bcc: ['ada@inxt.me'] }), 'to', ['ada@inxt.me']);

    expect(recipients).toEqual(recipientsByField({ to: ['ada@inxt.me'] }));
  });

  test('when an address that is in blind copy is added in copy, then it leaves blind copy', () => {
    const recipients = addRecipients(recipientsByField({ bcc: ['ada@inxt.me', 'grace@inxt.me'] }), 'cc', [
      'ada@inxt.me',
    ]);

    expect(recipients).toEqual(recipientsByField({ cc: ['ada@inxt.me'], bcc: ['grace@inxt.me'] }));
  });

  test('when an address that is in copy is added as a main recipient, then it leaves copy', () => {
    const recipients = addRecipients(recipientsByField({ cc: ['ada@inxt.me'] }), 'to', ['ada@inxt.me']);

    expect(recipients).toEqual(recipientsByField({ to: ['ada@inxt.me'] }));
  });

  test('when an address in blind copy is added as a main recipient with other casing and spaces around it, then it leaves blind copy', () => {
    const recipients = addRecipients(recipientsByField({ bcc: ['Ada@inxt.me'] }), 'to', [' ada@INXT.me ']);

    expect(recipients.to).toHaveLength(1);
    expect(recipients.bcc).toEqual([]);
  });

  test('when an address that is in copy is added in blind copy, then it stays only in copy', () => {
    const recipients = addRecipients(recipientsByField({ cc: ['ada@inxt.me'] }), 'bcc', ['ada@inxt.me']);

    expect(recipients).toEqual(recipientsByField({ cc: ['ada@inxt.me'] }));
  });

  test('when an address is added to a field that already holds it with another casing, then it appears once', () => {
    const recipients = addRecipients(recipientsByField({ to: ['Ada@inxt.me'] }), 'to', ['ada@INXT.me']);

    expect(recipients.to).toEqual(['Ada@inxt.me']);
  });

  test('when the same address is added twice at once, then it appears once', () => {
    const recipients = addRecipients(recipientsByField(), 'to', ['ada@inxt.me', 'ada@inxt.me']);

    expect(recipients.to).toEqual(['ada@inxt.me']);
  });
});

describe('Turning what is typed into recipients', () => {
  test('when the typed text mixes addresses and something that is not one, then the addresses become recipients and the rest stays typed', () => {
    const { recipients, remainingText } = addTypedRecipients(
      recipientsByField(),
      'to',
      'ada@inxt.me, not an address, grace@inxt.me',
    );

    expect(recipients.to).toEqual(['ada@inxt.me', 'grace@inxt.me']);
    expect(remainingText).toBe('not an address');
  });

  test('when everything typed is turned into recipients at once, then an address typed both as main recipient and in blind copy ends up only as main recipient', () => {
    const { recipients, pendingText } = addEveryTypedRecipient(recipientsByField(), {
      to: 'ada@inxt.me',
      cc: '',
      bcc: 'ada@inxt.me, grace@inxt.me',
    });

    expect(recipients).toEqual(recipientsByField({ to: ['ada@inxt.me'], bcc: ['grace@inxt.me'] }));
    expect(pendingText).toEqual(EMPTY_PENDING_RECIPIENT_TEXT);
  });
});

describe('Finding what is typed and cannot be read as an address', () => {
  test('when fields still hold text that is not an address, then each of those texts is listed', () => {
    expect(findUnreadableRecipientText({ to: '', cc: 'grace@inxt', bcc: '  not an address  ' })).toEqual([
      'grace@inxt',
      'not an address',
    ]);
  });

  test('when nothing is left typed in any field, then nothing is listed', () => {
    expect(findUnreadableRecipientText(EMPTY_PENDING_RECIPIENT_TEXT)).toEqual([]);
  });
});

describe('Knowing whether a message has somebody to go to', () => {
  test('when the only main recipient is typed and not confirmed, then the message has somebody to go to', () => {
    expect(hasMainRecipient(recipientsByField(), { ...EMPTY_PENDING_RECIPIENT_TEXT, to: 'ada@inxt.me' })).toBe(true);
  });

  test('when what is typed as main recipient is not an address, then the message has nobody to go to', () => {
    expect(hasMainRecipient(recipientsByField(), { ...EMPTY_PENDING_RECIPIENT_TEXT, to: 'ada lovelace' })).toBe(false);
  });

  test('when there are only recipients in copy, then the message has nobody to go to', () => {
    expect(hasMainRecipient(recipientsByField({ cc: ['ada@inxt.me'] }), EMPTY_PENDING_RECIPIENT_TEXT)).toBe(false);
  });
});

describe('Knowing whether a message will travel encrypted end to end', () => {
  test('when every recipient is on an Internxt domain, then the message travels encrypted end to end', () => {
    const recipients = recipientsByField({ to: ['ada@inxt.me'], cc: ['grace@inxt.me'] });

    expect(isEndToEndEncrypted(recipients, EMPTY_PENDING_RECIPIENT_TEXT, INTERNXT_ACTIVE_DOMAINS)).toBe(true);
  });

  test('when somebody outside Internxt is in blind copy, then the message does not travel encrypted end to end', () => {
    const recipients = recipientsByField({ to: ['ada@inxt.me'], bcc: ['someone@gmail.com'] });

    expect(isEndToEndEncrypted(recipients, EMPTY_PENDING_RECIPIENT_TEXT, INTERNXT_ACTIVE_DOMAINS)).toBe(false);
  });

  test('when an address outside Internxt is still being typed, then the message stops being shown as encrypted end to end', () => {
    const recipients = recipientsByField({ to: ['ada@inxt.me'] });

    expect(
      isEndToEndEncrypted(
        recipients,
        { ...EMPTY_PENDING_RECIPIENT_TEXT, cc: 'someone@gmail.com' },
        INTERNXT_ACTIVE_DOMAINS,
      ),
    ).toBe(false);
  });

  test('when the only recipient is an Internxt address still being typed, then the message is shown as encrypted end to end', () => {
    const pendingText = { ...EMPTY_PENDING_RECIPIENT_TEXT, to: 'ada@inxt.me' };

    expect(isEndToEndEncrypted(recipientsByField(), pendingText, INTERNXT_ACTIVE_DOMAINS)).toBe(true);
  });

  test('when something that is not an address is typed next to Internxt recipients, then the message is still shown as encrypted end to end', () => {
    const recipients = recipientsByField({ to: ['ada@inxt.me'] });
    const pendingText = { ...EMPTY_PENDING_RECIPIENT_TEXT, cc: 'bob@gmai' };

    expect(isEndToEndEncrypted(recipients, pendingText, INTERNXT_ACTIVE_DOMAINS)).toBe(true);
  });

  test('when every recipient is on an Internxt domain and one of them is in blind copy, then the message is still shown as encrypted end to end', () => {
    const recipients = recipientsByField({ to: ['ada@inxt.me'], bcc: ['grace@inxt.me'] });

    expect(isEndToEndEncrypted(recipients, EMPTY_PENDING_RECIPIENT_TEXT, INTERNXT_ACTIVE_DOMAINS)).toBe(true);
  });

  test('when the Internxt domains are not known yet, then the message is not shown as encrypted end to end', () => {
    const recipients = recipientsByField({ to: ['ada@inxt.me'] });

    expect(isEndToEndEncrypted(recipients, EMPTY_PENDING_RECIPIENT_TEXT, null)).toBe(false);
  });

  test('when the message has nobody to go to, then it is not shown as encrypted end to end', () => {
    expect(isEndToEndEncrypted(recipientsByField(), EMPTY_PENDING_RECIPIENT_TEXT, INTERNXT_ACTIVE_DOMAINS)).toBe(false);
  });
});

describe('Knowing whether the copy fields have to stay visible', () => {
  test('when somebody is in blind copy, then the copy fields stay visible', () => {
    expect(
      hasCopyOrBlindCopyRecipients(recipientsByField({ bcc: ['ada@inxt.me'] }), EMPTY_PENDING_RECIPIENT_TEXT),
    ).toBe(true);
  });

  test('when something is typed in copy and not confirmed, then the copy fields stay visible', () => {
    const pendingText = { ...EMPTY_PENDING_RECIPIENT_TEXT, cc: 'ada@inx' };

    expect(hasCopyOrBlindCopyRecipients(recipientsByField(), pendingText)).toBe(true);
  });

  test('when only blank space is typed in the copy fields, then they can be hidden', () => {
    const pendingText = { ...EMPTY_PENDING_RECIPIENT_TEXT, cc: '  ', bcc: ' ' };

    expect(hasCopyOrBlindCopyRecipients(recipientsByField(), pendingText)).toBe(false);
  });
});

describe('Knowing whether a message can be sent', () => {
  const MAIN_RECIPIENT_BEING_TYPED = { ...EMPTY_PENDING_RECIPIENT_TEXT, to: 'ada@inxt.me' };

  test('when the only main recipient is typed and the subject is filled, then the message can be sent', () => {
    expect(
      canSendMessage({
        recipients: recipientsByField(),
        pendingText: MAIN_RECIPIENT_BEING_TYPED,
        subject: 'The numbers',
        isSending: false,
      }),
    ).toBe(true);
  });

  test('when the subject is only blank space, then the message cannot be sent', () => {
    expect(
      canSendMessage({
        recipients: recipientsByField(),
        pendingText: MAIN_RECIPIENT_BEING_TYPED,
        subject: '   ',
        isSending: false,
      }),
    ).toBe(false);
  });

  test('when the message is already being sent, then it cannot be sent again', () => {
    expect(
      canSendMessage({
        recipients: recipientsByField(),
        pendingText: MAIN_RECIPIENT_BEING_TYPED,
        subject: 'The numbers',
        isSending: true,
      }),
    ).toBe(false);
  });

  test('when the message has nobody to go to, then it cannot be sent', () => {
    expect(
      canSendMessage({
        recipients: recipientsByField(),
        pendingText: EMPTY_PENDING_RECIPIENT_TEXT,
        subject: 'The numbers',
        isSending: false,
      }),
    ).toBe(false);
  });
});
