import { HTTP_INTERNAL_SERVER_ERROR, HTTP_UNPROCESSABLE_ENTITY } from '../common/httpStatusCodes';
import { MAX_LOGGED_REASON_LENGTH, describeErrorForLog } from './errorDescription';
import { AttachmentUploadFailedError, InternxtRecipientKeyMissingError } from './errors';

describe('Describing an error for the logs', () => {
  test('when the failure carries the server answer, then the status, the reason and the request id are kept', () => {
    const failure = { cause: { status: HTTP_UNPROCESSABLE_ENTITY, data: { message: 'nope' }, xRequestId: 'abc' } };

    expect(describeErrorForLog(failure)).toEqual({
      errorName: undefined,
      causeName: undefined,
      status: HTTP_UNPROCESSABLE_ENTITY,
      reason: 'nope',
      requestId: 'abc',
    });
  });

  test('when nothing is known about the failure, then the description is empty instead of throwing', () => {
    expect(describeErrorForLog(undefined)).toEqual({
      errorName: undefined,
      causeName: undefined,
      status: undefined,
      reason: undefined,
      requestId: undefined,
    });
  });

  test('when an error is not a failed request, then its name and the name of its cause are kept but not what they say', () => {
    const error = new AttachmentUploadFailedError('private-contract.pdf', new TypeError('/files/private-contract.pdf'));

    const description = describeErrorForLog(error);

    expect(description).toMatchObject({ errorName: 'AttachmentUploadFailedError', causeName: 'TypeError' });
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
