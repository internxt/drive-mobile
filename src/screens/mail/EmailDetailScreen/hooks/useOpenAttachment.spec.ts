import { act, renderHook } from '@testing-library/react-native';

import strings from '../../../../../assets/lang/strings';
import {
  AttachmentToOpen,
  downloadDecryptAndOpenAttachment,
} from '../../../../services/mail/mailAttachment.service';
import { notifications } from '../../../../services/NotificationsService';
import { useOpenAttachment } from './useOpenAttachment';

jest.mock('../../../../services/mail/mailAttachment.service', () => ({
  downloadDecryptAndOpenAttachment: jest.fn(),
}));

jest.mock('../../../../services/NotificationsService', () => ({
  notifications: { error: jest.fn(), success: jest.fn(), info: jest.fn() },
}));

jest.mock('../../../../services/common/logger/logger.service', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const downloadDecryptAndOpenAttachmentMock = downloadDecryptAndOpenAttachment as jest.Mock;

const anAttachment = (blobId: string): AttachmentToOpen => ({
  emailId: 'email-1',
  blobId,
  name: `${blobId}.pdf`,
  type: 'application/pdf',
  attachmentsSessionKey: 'session-key',
});

const openingThatFinishesWhenTold = () => {
  let finishOpening: () => void = () => undefined;
  downloadDecryptAndOpenAttachmentMock.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finishOpening = resolve;
      }),
  );
  return () => finishOpening();
};

describe('Opening the attachments of a message', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('when an attachment is being opened, then the screen knows which one it is', async () => {
    const finishOpening = openingThatFinishesWhenTold();
    const { result } = renderHook(() => useOpenAttachment());

    let opening: Promise<void> = Promise.resolve();
    act(() => {
      opening = result.current.openAttachment(anAttachment('report'));
    });

    expect(result.current.openingAttachmentId).toBe('report');

    await act(async () => {
      finishOpening();
      await opening;
    });

    expect(result.current.openingAttachmentId).toBeNull();
  });

  test('when an attachment is being opened, then tapping any attachment again does not start a second download', async () => {
    const finishOpening = openingThatFinishesWhenTold();
    const { result } = renderHook(() => useOpenAttachment());

    let opening: Promise<void> = Promise.resolve();
    act(() => {
      opening = result.current.openAttachment(anAttachment('report'));
    });
    await act(async () => {
      await result.current.openAttachment(anAttachment('report'));
      await result.current.openAttachment(anAttachment('invoice'));
    });

    expect(downloadDecryptAndOpenAttachmentMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      finishOpening();
      await opening;
    });
  });

  test('when the attachment finishes opening, then the attachments can be opened again', async () => {
    downloadDecryptAndOpenAttachmentMock.mockResolvedValue(undefined);
    const { result } = renderHook(() => useOpenAttachment());

    await act(async () => {
      await result.current.openAttachment(anAttachment('report'));
    });
    await act(async () => {
      await result.current.openAttachment(anAttachment('invoice'));
    });

    expect(downloadDecryptAndOpenAttachmentMock).toHaveBeenCalledTimes(2);
  });

  test('when opening an attachment fails, then the user is told it could not be opened and can try again', async () => {
    downloadDecryptAndOpenAttachmentMock.mockRejectedValueOnce(new Error('Network down'));
    const { result } = renderHook(() => useOpenAttachment());

    await act(async () => {
      await result.current.openAttachment(anAttachment('report'));
    });

    expect(notifications.error).toHaveBeenCalledWith(strings.screens.email_detail.attachmentOpenFailed);
    expect(result.current.openingAttachmentId).toBeNull();
  });
});
