import { useCallback, useMemo, useState } from 'react';
import { TimelinePhotoItem } from '../types';

export interface PhotoSelection {
  selectMode: boolean;
  selectedIds: Set<string>;
  selectedItems: TimelinePhotoItem[];
  enterSelectMode: (id?: string) => void;
  exitSelectMode: () => void;
  toggleSelect: (id: string) => void;
}

export const usePhotoSelection = (allItems: TimelinePhotoItem[]): PhotoSelection => {
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const enterSelectMode = useCallback((id?: string) => {
    setSelectMode(true);
    setSelectedIds(id ? new Set([id]) : new Set());
  }, []);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prevState) => {
      const newState = new Set(prevState);
      if (newState.has(id)) {
        newState.delete(id);
      } else {
        newState.add(id);
      }
      return newState;
    });
  }, []);

  const selectedItems = useMemo(() => allItems.filter((item) => selectedIds.has(item.id)), [allItems, selectedIds]);

  return { selectMode, selectedIds, selectedItems, enterSelectMode, exitSelectMode, toggleSelect };
};
