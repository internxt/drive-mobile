import { act, renderHook } from '@testing-library/react-hooks';

import { useEmailBodyHeight } from './useEmailBodyHeight';

jest.mock('@internxt-mobile/services/common/logger/logger.service', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const A_DOCUMENT = '<html><body>Hello there</body></html>';
const ANOTHER_DOCUMENT = '<html><body>Something else</body></html>';

describe('Measuring how tall a message needs to be', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('when the message has not been measured yet, then it has no height', () => {
    const { result } = renderHook(() => useEmailBodyHeight(A_DOCUMENT));

    expect(result.current.height).toBe(0);
  });

  test('when the message reports how tall it is, then that is the height it gets', () => {
    const { result } = renderHook(() => useEmailBodyHeight(A_DOCUMENT));

    act(() => result.current.onHeightReported('640'));

    expect(result.current.height).toBe(640);
  });

  test('when the message is very long, then its whole height is kept', () => {
    const { result } = renderHook(() => useEmailBodyHeight(A_DOCUMENT));

    act(() => result.current.onHeightReported('51708'));

    expect(result.current.height).toBe(51708);
  });

  test('when what the message reports is not a number, then it is ignored', () => {
    const { result } = renderHook(() => useEmailBodyHeight(A_DOCUMENT));

    act(() => result.current.onHeightReported('640'));
    act(() => result.current.onHeightReported('not a height'));

    expect(result.current.height).toBe(640);
  });

  test('when the message reports no height at all, then it is ignored', () => {
    const { result } = renderHook(() => useEmailBodyHeight(A_DOCUMENT));

    act(() => result.current.onHeightReported('640'));
    act(() => result.current.onHeightReported('0'));

    expect(result.current.height).toBe(640);
  });

  test('when the message never reports its height, then it still gets one so it is not left invisible', () => {
    const { result } = renderHook(() => useEmailBodyHeight(A_DOCUMENT));

    act(() => jest.runAllTimers());

    expect(result.current.height).toBeGreaterThan(0);
  });

  test('when the message reported its height in time, then the fallback does not replace it', () => {
    const { result } = renderHook(() => useEmailBodyHeight(A_DOCUMENT));

    act(() => result.current.onHeightReported('640'));
    act(() => jest.runAllTimers());

    expect(result.current.height).toBe(640);
  });

  test('when the message cannot be displayed at all, then it still gets a height', () => {
    const { result } = renderHook(() => useEmailBodyHeight(A_DOCUMENT));

    act(() => result.current.onMeasureFailed(new Error('the page could not be loaded')));

    expect(result.current.height).toBeGreaterThan(0);
  });

  test('when another message is displayed, then it is measured again instead of keeping the previous height', () => {
    const { result, rerender } = renderHook(({ document }) => useEmailBodyHeight(document), {
      initialProps: { document: A_DOCUMENT },
    });
    act(() => result.current.onHeightReported('640'));

    rerender({ document: ANOTHER_DOCUMENT });

    expect(result.current.height).toBe(0);
  });
});
