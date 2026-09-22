import strings from '../../../../assets/lang/strings';
import {
  BlindCopyNotDeliverableError,
  InternxtRecipientKeyMissingError,
  MailErrorName,
  PrimaryRecipientMissingError,
} from '../../../services/mail/errors';
import { SEND_ERROR_MESSAGES, describeSendFailure, getSendErrorMessage } from './sendErrors';

const messages = strings.screens.compose_email.errors;

describe('Explaining to the user why a message was not sent', () => {
  test('when a new kind of send failure exists, then it has its own explanation instead of the generic one', () => {
    for (const errorName of Object.values(MailErrorName)) {
      expect(SEND_ERROR_MESSAGES.has(errorName)).toBe(true);
    }
  });

  test('when the message cannot be sent because it has a blind copy inside Internxt, then the reason says where to move the recipient', () => {
    expect(getSendErrorMessage(new BlindCopyNotDeliverableError())).toBe(messages.blindCopyNotDeliverable);
  });

  test('when everybody is in copy, then the reason says a main recipient is needed instead of claiming there is nobody', () => {
    expect(getSendErrorMessage(new PrimaryRecipientMissingError())).toBe(messages.primaryRecipientMissing);
    expect(getSendErrorMessage(new PrimaryRecipientMissingError())).not.toBe(messages.noRecipients);
  });

  test('when some recipients cannot receive encrypted mail, then the reason names them', () => {
    const reason = getSendErrorMessage(new InternxtRecipientKeyMissingError(['one@inxt.me', 'two@inxt.me']));

    expect(reason).toContain('one@inxt.me');
    expect(reason).toContain('two@inxt.me');
  });

  test('when the failure is not one we know about, then the generic reason is shown', () => {
    expect(getSendErrorMessage(new Error('boom'))).toBe(messages.sendFailed);
  });

  test('when something that is not an error is thrown, then the generic reason is shown', () => {
    expect(getSendErrorMessage('boom')).toBe(messages.sendFailed);
  });
});

describe('Describing a failed send for the logs', () => {
  test('when the failure carries the server answer, then the status, the reason and the request id are kept', () => {
    const failure = { cause: { status: 422, data: { message: 'nope' }, xRequestId: 'abc' } };

    expect(describeSendFailure(failure)).toEqual({ status: 422, reason: 'nope', requestId: 'abc' });
  });

  test('when the failure carries nothing from the server, then the description is empty instead of throwing', () => {
    expect(describeSendFailure(undefined)).toEqual({ status: undefined, reason: undefined, requestId: undefined });
  });

  test('when the server answer holds the request that failed, then neither the recipients nor the message reach the description', () => {
    const failure = {
      cause: {
        status: 500,
        xRequestId: 'abc',
        data: {
          message: 'delivery failed',
          request: {
            to: [{ email: 'visible@inxt.me' }],
            cc: [{ email: 'copied@inxt.me' }],
            bcc: [{ email: 'hidden@inxt.me' }],
            subject: 'the subject',
            encryption: { encryptedText: 'the envelope' },
          },
        },
      },
    };

    const description = JSON.stringify(describeSendFailure(failure));

    expect(description).not.toContain('hidden@inxt.me');
    expect(description).not.toContain('visible@inxt.me');
    expect(description).not.toContain('copied@inxt.me');
    expect(description).not.toContain('the subject');
    expect(description).not.toContain('the envelope');
    expect(description).toContain('delivery failed');
  });

  test('when no key can be found for some recipients, then their addresses are not part of the logged error', () => {
    const error = new InternxtRecipientKeyMissingError(['one@inxt.me']);

    expect(error.message).not.toContain('one@inxt.me');
    expect(error.stack).not.toContain('one@inxt.me');
  });
});
