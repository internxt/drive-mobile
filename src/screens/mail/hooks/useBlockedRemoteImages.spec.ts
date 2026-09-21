import { act, renderHook } from '@testing-library/react-hooks';

import { BLOCKED_REMOTE_IMAGE_MESSAGE } from '../../../services/mail/emailBody/emailDocument';
import { useBlockedRemoteImages } from './useBlockedRemoteImages';

const A_DOCUMENT = '<html><body>Hello there</body></html>';
const ANOTHER_DOCUMENT = '<html><body>Something else</body></html>';

describe('Knowing whether a message had its images blocked', () => {
  test('when the message has not reported anything, then no image is blocked', () => {
    const { result } = renderHook(() => useBlockedRemoteImages(A_DOCUMENT));

    expect(result.current.hasBlockedRemoteImages).toBe(false);
  });

  test('when the message reports a blocked image, then its images are blocked', () => {
    const { result } = renderHook(() => useBlockedRemoteImages(A_DOCUMENT));

    act(() => result.current.onBlockedRemoteImageReported());

    expect(result.current.hasBlockedRemoteImages).toBe(true);
  });

  test('when the message reports a blocked image, then the report is recognised', () => {
    const { result } = renderHook(() => useBlockedRemoteImages(A_DOCUMENT));

    expect(result.current.isBlockedRemoteImageReport(BLOCKED_REMOTE_IMAGE_MESSAGE)).toBe(true);
  });

  test('when the message reports its height, then it is not taken as a blocked image', () => {
    const { result } = renderHook(() => useBlockedRemoteImages(A_DOCUMENT));

    expect(result.current.isBlockedRemoteImageReport('640')).toBe(false);
  });

  test('when another message is displayed, then it starts with no image blocked', () => {
    const { result, rerender } = renderHook(({ emailDocument }) => useBlockedRemoteImages(emailDocument), {
      initialProps: { emailDocument: A_DOCUMENT },
    });
    act(() => result.current.onBlockedRemoteImageReported());

    rerender({ emailDocument: ANOTHER_DOCUMENT });

    expect(result.current.hasBlockedRemoteImages).toBe(false);
  });
});
