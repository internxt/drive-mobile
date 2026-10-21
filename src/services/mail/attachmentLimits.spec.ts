import { ENCRYPTED_ATTACHMENT_OVERHEAD_BYTES, MAX_ATTACHMENT_BYTES, isAttachmentTooLarge } from './attachmentLimits';

describe('Knowing whether an attachment fits the server', () => {
  test('when the size of a file is not known, then it is not refused', () => {
    expect(isAttachmentTooLarge({ size: undefined })).toBe(false);
  });

  test('when a file still fits once it is encrypted, then it is accepted', () => {
    expect(isAttachmentTooLarge({ size: MAX_ATTACHMENT_BYTES - ENCRYPTED_ATTACHMENT_OVERHEAD_BYTES })).toBe(false);
  });

  test('when a file only goes over the limit once it is encrypted, then it is refused', () => {
    expect(isAttachmentTooLarge({ size: MAX_ATTACHMENT_BYTES - ENCRYPTED_ATTACHMENT_OVERHEAD_BYTES + 1 })).toBe(true);
  });
});
