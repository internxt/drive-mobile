import { useCallback, useMemo, useRef, useState } from 'react';
import { TimelinePhotoItem } from '../types';

export interface PhotoSelection {
  isSelectMode: boolean;
  selectedIds: Set<string>;
  selectedItems: TimelinePhotoItem[];
  enterSelectMode: (id?: string) => void;
  exitSelectMode: () => void;
  toggleSelect: (id: string) => void;
  beginDragSelect: (index: number) => void;
  updateDragSelect: (index: number) => void;
  endDragSelect: () => void;
}

export const usePhotoSelection = (allItems: TimelinePhotoItem[]): PhotoSelection => {
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  // Refs instead of state so updates during a drag don't trigger extra re-renders
  const dragAnchorIndexRef = useRef<number | null>(null);
  const dragSelectionSnapshotRef = useRef<Set<string>>(new Set());
  const dragShouldSelectRef = useRef(true);

  const enterSelectMode = useCallback((id?: string) => {
    setIsSelectMode(true);
    setSelectedIds(id ? new Set([id]) : new Set());
  }, []);

  const exitSelectMode = useCallback(() => {
    setIsSelectMode(false);
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

  // Snapshots the current selection so updateDragSelect can recompute the full
  // range from scratch on each move — prevents toggle-thrash when backtracking.
  const beginDragSelect = useCallback(
    (index: number) => {
      const anchorItem = allItems[index];
      if (!anchorItem) {
        return;
      }
      dragAnchorIndexRef.current = index;
      dragSelectionSnapshotRef.current = new Set(selectedIds);
      dragShouldSelectRef.current = !selectedIds.has(anchorItem.id);
    },
    [allItems, selectedIds],
  );

  const updateDragSelect = useCallback(
    (index: number) => {
      const anchor = dragAnchorIndexRef.current;
      if (anchor === null) {
        return;
      }
      const rangeStart = Math.min(anchor, index);
      const rangeEnd = Math.max(anchor, index);
      const shouldSelect = dragShouldSelectRef.current;
      const selectionSnapshot = dragSelectionSnapshotRef.current;
      setSelectedIds(() => {
        const updatedSelection = new Set(selectionSnapshot);
        for (let i = rangeStart; i <= rangeEnd; i++) {
          const item = allItems[i];
          if (!item) {
            continue;
          }
          if (shouldSelect) {
            updatedSelection.add(item.id);
          } else {
            updatedSelection.delete(item.id);
          }
        }
        return updatedSelection;
      });
    },
    [allItems],
  );

  const endDragSelect = useCallback(() => {
    dragAnchorIndexRef.current = null;
    dragSelectionSnapshotRef.current = new Set();
  }, []);

  const selectedItems = useMemo(() => allItems.filter((item) => selectedIds.has(item.id)), [allItems, selectedIds]);

  return {
    isSelectMode,
    selectedIds,
    selectedItems,
    enterSelectMode,
    exitSelectMode,
    toggleSelect,
    beginDragSelect,
    updateDragSelect,
    endDragSelect,
  };
};
