import { EmailResponse } from '@internxt/sdk/dist/mail/types';

import { summarizeRecipients } from './recipientSummary';

const SELF_ADDRESS = 'me@inxt.eu';

const buildMessage = (recipients: Partial<Pick<EmailResponse, 'to' | 'cc' | 'bcc'>>): EmailResponse =>
  ({ to: [], cc: [], bcc: [], ...recipients }) as unknown as EmailResponse;

describe('Summing up who a message went to', () => {
  test('when the message was sent only to me, then I am included and nobody else is counted', () => {
    const summary = summarizeRecipients(buildMessage({ to: [{ email: SELF_ADDRESS }] }), SELF_ADDRESS);

    expect(summary).toEqual({ isSelfIncluded: true, firstRecipientLabel: SELF_ADDRESS, otherRecipientCount: 0 });
  });

  test('when I am in copy along with others, then I am included and the rest are counted', () => {
    const message = buildMessage({ to: [{ email: 'someone@inxt.eu' }], cc: [{ email: SELF_ADDRESS }] });

    expect(summarizeRecipients(message, SELF_ADDRESS)).toMatchObject({ isSelfIncluded: true, otherRecipientCount: 1 });
  });

  test('when my address is written with different case, then I am still recognised', () => {
    const summary = summarizeRecipients(buildMessage({ to: [{ email: 'Me@Inxt.EU' }] }), SELF_ADDRESS);

    expect(summary?.isSelfIncluded).toBe(true);
  });

  test('when the message was sent to other people, then the first one is named by their display name', () => {
    const message = buildMessage({
      to: [{ name: 'Alex', email: 'alex@inxt.eu' }],
      cc: [{ email: 'another@inxt.eu' }],
    });

    expect(summarizeRecipients(message, SELF_ADDRESS)).toEqual({
      isSelfIncluded: false,
      firstRecipientLabel: 'Alex',
      otherRecipientCount: 1,
    });
  });

  test('when the first recipient has no display name, then their address is used', () => {
    const summary = summarizeRecipients(buildMessage({ to: [{ name: '  ', email: 'alex@inxt.eu' }] }), SELF_ADDRESS);

    expect(summary?.firstRecipientLabel).toBe('alex@inxt.eu');
  });

  test('when the message has hidden copies, then they are counted too', () => {
    const message = buildMessage({ to: [{ email: 'alex@inxt.eu' }], bcc: [{ email: 'hidden@inxt.eu' }] });

    expect(summarizeRecipients(message, SELF_ADDRESS)?.otherRecipientCount).toBe(1);
  });

  test('when the message carries no copy lists at all, then the recipients it has are still summed up', () => {
    const message = { to: [{ email: 'alex@inxt.eu' }] } as unknown as EmailResponse;

    expect(summarizeRecipients(message, SELF_ADDRESS)).toEqual({
      isSelfIncluded: false,
      firstRecipientLabel: 'alex@inxt.eu',
      otherRecipientCount: 0,
    });
  });

  test('when the message has no recipients, then there is nothing to sum up', () => {
    expect(summarizeRecipients(buildMessage({}), SELF_ADDRESS)).toBeNull();
  });

  test('when my own address is not known yet, then I am never counted as included', () => {
    const summary = summarizeRecipients(buildMessage({ to: [{ email: SELF_ADDRESS }] }), '');

    expect(summary?.isSelfIncluded).toBe(false);
  });
});
