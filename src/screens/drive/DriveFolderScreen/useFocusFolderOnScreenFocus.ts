import { useDrive } from '@internxt-mobile/hooks/drive';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

/**
 * Makes the folder the focused one of the Drive context every time its screen gains focus.
 */
export const useFocusFolderOnScreenFocus = (folderUuid: string): void => {
  const { focusFolder } = useDrive();

  useFocusEffect(
    useCallback(() => {
      focusFolder(folderUuid);
    }, [folderUuid]),
  );
};
