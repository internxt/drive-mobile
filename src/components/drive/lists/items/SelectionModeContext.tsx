import { createContext, useContext } from 'react';
import { SharedValue } from 'react-native-reanimated';

export const SelectionModeContext = createContext<SharedValue<number> | undefined>(undefined);

/**
 * Returns the shared value that goes from 0 to 1 while the list enters selection mode, and back when it leaves.
 */
export const useSelectionModeProgress = (): SharedValue<number> => {
  const selectionModeProgress = useContext(SelectionModeContext);
  if (!selectionModeProgress) {
    throw new Error('useSelectionModeProgress must be used inside a SelectionModeContext provider');
  }
  return selectionModeProgress;
};
