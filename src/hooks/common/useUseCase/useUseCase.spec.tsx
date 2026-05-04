import { renderHook, waitFor } from '@testing-library/react-native';
import { useUseCase } from './useUseCase';

describe('useUseCase', () => {
  test('when use case resolves successfully, then data is set and no error', async () => {
    const mockedUseCase = jest.fn(async () => {
      return true;
    });
    const { result } = renderHook(() => useUseCase<boolean>(mockedUseCase));

    await waitFor(() => expect(result.current.data).toBe(true));
    expect(mockedUseCase).toHaveBeenCalledTimes(1);
  });
});
