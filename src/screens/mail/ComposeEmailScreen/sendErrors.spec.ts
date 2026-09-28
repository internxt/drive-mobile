import strings from '../../../../assets/lang/strings';
import { HTTP_INTERNAL_SERVER_ERROR, HTTP_TOO_MANY_REQUESTS } from '../../../services/common/httpStatusCodes';
import {
  AttachmentUploadFailedError,
  BlindCopyNotDeliverableError,
  InternxtRecipientKeyMissingError,
  MailErrorName,
  PrimaryRecipientMissingError,
} from '../../../services/mail/errors';
import { SEND_ERROR_MESSAGES, getSendErrorMessage, isSendRateLimited } from './sendErrors';

const messages = strings.screens.compose_email.errors;

const ERROR_NAMES_A_SEND_CANNOT_THROW: string[] = [MailErrorName.AttachmentUploadAborted];

describe('Explaining to the user why a message was not sent', () => {
  test('when a new kind of send failure exists, then it has its own explanation instead of the generic one', () => {
    const sendErrorNames = Object.values(MailErrorName).filter(
      (errorName) => !ERROR_NAMES_A_SEND_CANNOT_THROW.includes(errorName),
    );

    for (const errorName of sendErrorNames) {
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

describe('Explaining a send that reached the sending limit', () => {
  const throttledRequestError = () => Object.assign(new Error('Too many requests'), { status: HTTP_TOO_MANY_REQUESTS });

  test('when the account reached its sending limit, then the reason says so instead of the generic one', () => {
    expect(getSendErrorMessage(throttledRequestError())).toBe(messages.sendRateLimited);
  });

  test('when a send was throttled, then it is recognised as having reached the sending limit', () => {
    expect(isSendRateLimited(throttledRequestError())).toBe(true);
    expect(isSendRateLimited(Object.assign(new Error('Server error'), { status: HTTP_INTERNAL_SERVER_ERROR }))).toBe(
      false,
    );
  });

  test('when uploading an attachment reached the limit, then the reason still names the attachment', () => {
    const reason = getSendErrorMessage(new AttachmentUploadFailedError('plan.pdf', throttledRequestError()));

    expect(reason).toContain('plan.pdf');
  });
});
