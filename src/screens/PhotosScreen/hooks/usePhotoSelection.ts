import { useCallback, useMemo, useRef, useState } from 'react';
import { TimelinePhotoItem } from '../types';
import { isItemSelectable } from '../utils/photoUtils';

export interface PhotoSelection {
  isSelectMode: boolean;
  selectedIds: Set<string>;
  selectedItems: TimelinePhotoItem[];
  enterSelectMode: (id?: string) => void;
  exitSelectMode: () => void;
  toggleSelect: (id: string) => void;
  beginDragSelect: (index: number, displayedItems: TimelinePhotoItem[]) => void;
  updateDragSelect: (index: number, displayedItems: TimelinePhotoItem[]) => void;
  endDragSelect: () => void;
}

interface DragAnchor {
  id: string;
  index: number;
  displayedItems: TimelinePhotoItem[];
}

export const usePhotoSelection = (allItems: TimelinePhotoItem[]): PhotoSelection => {
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  // Refs instead of state so updates during a drag don't trigger extra re-renders
  const dragAnchorRef = useRef<DragAnchor | null>(null);
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
    (index: number, displayedItems: TimelinePhotoItem[]) => {
      const anchorItem = displayedItems[index];
      if (!anchorItem || !isItemSelectable(anchorItem)) {
        return;
      }
      dragAnchorRef.current = { id: anchorItem.id, index, displayedItems };
      dragSelectionSnapshotRef.current = new Set(selectedIds);
      dragShouldSelectRef.current = !selectedIds.has(anchorItem.id);
    },
    [selectedIds],
  );

  const updateDragSelect = useCallback((index: number, displayedItems: TimelinePhotoItem[]) => {
    const dragAnchor = dragAnchorRef.current;
    if (dragAnchor === null) {
      return;
    }
    if (dragAnchor.displayedItems !== displayedItems) {
      dragAnchor.index = displayedItems.findIndex((item) => item.id === dragAnchor.id);
      dragAnchor.displayedItems = displayedItems;
    }
    if (dragAnchor.index === -1) {
      return;
    }
    const rangeStart = Math.min(dragAnchor.index, index);
    const rangeEnd = Math.max(dragAnchor.index, index);
    const shouldSelect = dragShouldSelectRef.current;
    const selectionSnapshot = dragSelectionSnapshotRef.current;
    setSelectedIds(() => {
      const updatedSelection = new Set(selectionSnapshot);
      for (let i = rangeStart; i <= rangeEnd; i++) {
        const item = displayedItems[i];
        if (!item || !isItemSelectable(item)) {
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
  }, []);

  const endDragSelect = useCallback(() => {
    dragAnchorRef.current = null;
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
