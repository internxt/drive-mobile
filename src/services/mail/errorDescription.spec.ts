import { HTTP_FORBIDDEN, HTTP_INTERNAL_SERVER_ERROR, HTTP_UNPROCESSABLE_ENTITY } from '../common/httpStatusCodes';
import { MAX_LOGGED_REASON_LENGTH, describeErrorForLog, isMailNotSetUpError } from './errorDescription';
import { AttachmentTooLargeError, AttachmentUploadFailedError, InternxtRecipientKeyMissingError } from './errors';

describe('Describing an error for the logs', () => {
  test('when the failure carries the server answer, then the status, the reason and the request id are kept', () => {
    const failure = { cause: { status: HTTP_UNPROCESSABLE_ENTITY, data: { message: 'nope' }, xRequestId: 'abc' } };

    expect(describeErrorForLog(failure)).toEqual({
      errorName: undefined,
      causeName: undefined,
      message: undefined,
      status: HTTP_UNPROCESSABLE_ENTITY,
      reason: 'nope',
      requestId: 'abc',
    });
  });

  test('when nothing is known about the failure, then the description is empty instead of throwing', () => {
    expect(describeErrorForLog(undefined)).toEqual({
      errorName: undefined,
      causeName: undefined,
      message: undefined,
      status: undefined,
      reason: undefined,
      requestId: undefined,
    });
  });

  test('when an error that is not a failed request wraps another one, then what the wrapped one says is kept and what the wrapper says is not', () => {
    const error = new AttachmentUploadFailedError('private-contract.pdf', new TypeError('the file could not be read'));

    const description = describeErrorForLog(error);

    expect(description).toMatchObject({
      errorName: 'AttachmentUploadFailedError',
      causeName: 'TypeError',
      message: 'the file could not be read',
    });
    expect(JSON.stringify(description)).not.toContain('private-contract.pdf');
  });

  test('when an error that is not a failed request wraps nothing, then what it says is kept', () => {
    expect(describeErrorForLog(new Error('the key could not be decrypted'))).toMatchObject({
      errorName: 'Error',
      message: 'the key could not be decrypted',
    });
  });

  test('when a failed request also says something, then only the answer of the server is kept', () => {
    const failure = Object.assign(new Error('the request to send the email failed'), {
      status: HTTP_INTERNAL_SERVER_ERROR,
      data: { message: 'delivery failed' },
    });

    expect(describeErrorForLog(failure)).toMatchObject({ message: undefined, reason: 'delivery failed' });
  });

  test('when an error that is not a failed request says something long, then only its beginning reaches the description', () => {
    const error = new Error('a'.repeat(MAX_LOGGED_REASON_LENGTH * 2));

    expect(describeErrorForLog(error).message).toHaveLength(MAX_LOGGED_REASON_LENGTH);
  });

  test('when an attachment is too large, then its name is not part of the logged error', () => {
    const description = describeErrorForLog(new AttachmentTooLargeError('private-contract.pdf'));

    expect(description).toMatchObject({ errorName: 'AttachmentTooLargeError' });
    expect(JSON.stringify(description)).not.toContain('private-contract.pdf');
  });

  test('when the server answer holds the request that failed, then neither the recipients nor the message reach the description', () => {
    const failure = {
      cause: {
        status: HTTP_INTERNAL_SERVER_ERROR,
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

    const description = JSON.stringify(describeErrorForLog(failure));

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

  test('when the server answers with a long text, then only its beginning reaches the description', () => {
    const failure = { cause: { status: HTTP_INTERNAL_SERVER_ERROR, data: 'a'.repeat(MAX_LOGGED_REASON_LENGTH * 2) } };

    expect(describeErrorForLog(failure).reason).toHaveLength(MAX_LOGGED_REASON_LENGTH);
  });
});

describe('Telling apart a missing mail account', () => {
  test('when the server refuses the request because the account is not set up, then the account is reported as missing', () => {
    expect(isMailNotSetUpError({ status: HTTP_FORBIDDEN, data: { code: 'MAIL_NOT_SETUP' } })).toBe(true);
  });

  test('when the refusal comes wrapped in another error, then the account is still reported as missing', () => {
    expect(isMailNotSetUpError({ cause: { status: HTTP_FORBIDDEN, data: { code: 'MAIL_NOT_SETUP' } } })).toBe(true);
  });

  test('when the server refuses the request for another reason, then the account is not reported as missing', () => {
    expect(isMailNotSetUpError({ status: HTTP_FORBIDDEN, data: { code: 'MAIL_DEFAULT_ADDRESS_MISSING' } })).toBe(false);
  });

  test('when the request fails for a reason unrelated to the account, then the account is not reported as missing', () => {
    expect(isMailNotSetUpError({ status: HTTP_INTERNAL_SERVER_ERROR })).toBe(false);
    expect(isMailNotSetUpError(new Error('the network is down'))).toBe(false);
  });
});
