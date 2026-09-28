import { SdkManager } from '@internxt-mobile/services/common';
import { MailboxId } from '../../types/mail';
import { MAILBOX_PAGE_SIZE, MailboxService } from './mailbox.service';

jest.mock('@internxt-mobile/services/common', () => ({
  SdkManager: { getInstance: jest.fn() },
}));

const ATTACHMENT_TO_UPLOAD = { uri: '/tmp/encrypted-copy', name: 'notes.txt', type: 'text/plain' };
const UPLOADED_ATTACHMENT = { blobId: 'blob-1', name: 'notes.txt', type: 'text/plain', size: 10 };

const serverUploadThatFinishesWhenTold = () => {
  let finishUpload: () => void = () => undefined;
  const promise = new Promise((resolve) => {
    finishUpload = () => resolve(UPLOADED_ATTACHMENT);
  });
  return { sdkUploadResult: { promise, requestCanceler: { cancel: jest.fn() } }, finish: () => finishUpload() };
};

const createMailboxService = (sdkUploadAttachment: jest.Mock) =>
  new MailboxService({ mail: { uploadAttachment: sdkUploadAttachment } } as unknown as SdkManager);

describe('Uploading an attachment to the mail server', () => {
  test('when the upload cannot be cancelled, then it answers exactly as the server does', async () => {
    const sdkUploadAttachment = jest.fn().mockReturnValue({
      promise: Promise.resolve(UPLOADED_ATTACHMENT),
      requestCanceler: { cancel: jest.fn() },
    });

    await expect(createMailboxService(sdkUploadAttachment).uploadAttachment(ATTACHMENT_TO_UPLOAD)).resolves.toEqual(
      UPLOADED_ATTACHMENT,
    );
  });

  test('when the upload is cancelled while it runs, then the request is cancelled and the upload fails', async () => {
    const fakeServerUpload = serverUploadThatFinishesWhenTold();
    const sdkUploadAttachment = jest.fn().mockReturnValue(fakeServerUpload.sdkUploadResult);
    const abortController = new AbortController();

    const uploadInProgress = createMailboxService(sdkUploadAttachment).uploadAttachment(
      ATTACHMENT_TO_UPLOAD,
      abortController.signal,
    );
    abortController.abort();

    await expect(uploadInProgress).rejects.toThrow();
    expect(fakeServerUpload.sdkUploadResult.requestCanceler.cancel).toHaveBeenCalled();
  });

  test('when the upload was cancelled before it started, then no request is made', async () => {
    const sdkUploadAttachment = jest.fn();
    const abortController = new AbortController();
    abortController.abort();

    await expect(
      createMailboxService(sdkUploadAttachment).uploadAttachment(ATTACHMENT_TO_UPLOAD, abortController.signal),
    ).rejects.toThrow();
    expect(sdkUploadAttachment).not.toHaveBeenCalled();
  });

  test('when the upload is cancelled after it finished, then the finished upload stays as it was', async () => {
    const fakeServerUpload = serverUploadThatFinishesWhenTold();
    const sdkUploadAttachment = jest.fn().mockReturnValue(fakeServerUpload.sdkUploadResult);
    const abortController = new AbortController();

    const uploadInProgress = createMailboxService(sdkUploadAttachment).uploadAttachment(
      ATTACHMENT_TO_UPLOAD,
      abortController.signal,
    );
    fakeServerUpload.finish();

    await expect(uploadInProgress).resolves.toEqual(UPLOADED_ATTACHMENT);
    abortController.abort();
    expect(fakeServerUpload.sdkUploadResult.requestCanceler.cancel).not.toHaveBeenCalled();
  });
});

describe('Listing the emails of a mailbox', () => {
  const PAGE_FROM_SERVER = { emails: [{ id: 'email-1' }], total: 40, hasMoreMails: true, nextAnchor: 'anchor-2' };

  const createServiceListing = (sdkListEmails: jest.Mock) =>
    new MailboxService({ mail: { listEmails: sdkListEmails } } as unknown as SdkManager);

  test('when the first page is listed, then no anchor is sent and the page size is the fixed one', async () => {
    const sdkListEmails = jest.fn().mockResolvedValue(PAGE_FROM_SERVER);

    await createServiceListing(sdkListEmails).listEmails(MailboxId.Inbox);

    expect(sdkListEmails).toHaveBeenCalledWith({ mailbox: 'inbox', limit: MAILBOX_PAGE_SIZE, anchorId: undefined });
  });

  test('when a later page is listed, then it continues from the anchor the previous page gave', async () => {
    const sdkListEmails = jest.fn().mockResolvedValue(PAGE_FROM_SERVER);

    await createServiceListing(sdkListEmails).listEmails(MailboxId.Sent, { anchorId: 'anchor-2' });

    expect(sdkListEmails).toHaveBeenCalledWith({ mailbox: 'sent', limit: MAILBOX_PAGE_SIZE, anchorId: 'anchor-2' });
  });

  test('when a page is listed, then whether more remain and where they start come back along with the emails', async () => {
    const sdkListEmails = jest.fn().mockResolvedValue(PAGE_FROM_SERVER);

    await expect(createServiceListing(sdkListEmails).listEmails(MailboxId.Inbox)).resolves.toEqual(PAGE_FROM_SERVER);
  });
});
