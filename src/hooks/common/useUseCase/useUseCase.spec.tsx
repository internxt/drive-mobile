import { renderHook, waitFor } from '@testing-library/react-native';
import { useUseCase } from './useUseCase';

describe('useUseCase hook', () => {
  test('Should resolve with data once the use case function is completed without errors', async () => {
    const mockedUseCase = jest.fn(async () => {
      return true;
    });
    const { result } = renderHook(() => useUseCase<boolean>(mockedUseCase));

    await waitFor(() => expect(mockedUseCase).toHaveBeenCalledTimes(1));
    const { data } = result.current;
    expect(data).toBe(true);
  });
});
