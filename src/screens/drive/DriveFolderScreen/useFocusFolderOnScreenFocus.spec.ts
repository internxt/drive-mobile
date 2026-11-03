const mockFocusFolder = jest.fn();

jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

jest.mock('@internxt-mobile/hooks/drive', () => ({
  useDrive: () => ({ focusFolder: mockFocusFolder }),
}));

import { renderHook } from '@testing-library/react-native';
import { useFocusFolderOnScreenFocus } from './useFocusFolderOnScreenFocus';

describe('Focusing the Drive folder of the screen in view', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('when the screen gains focus, then its folder becomes the focused one', () => {
    renderHook(() => useFocusFolderOnScreenFocus('folder-uuid'));

    expect(mockFocusFolder).toHaveBeenCalledWith('folder-uuid');
  });

  test('when the screen shows another folder, then that folder becomes the focused one', () => {
    const { rerender } = renderHook(({ folderUuid }) => useFocusFolderOnScreenFocus(folderUuid), {
      initialProps: { folderUuid: 'folder-uuid' },
    });

    rerender({ folderUuid: 'other-folder-uuid' });

    expect(mockFocusFolder).toHaveBeenLastCalledWith('other-folder-uuid');
  });
});
