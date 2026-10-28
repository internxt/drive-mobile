import { useEffect, useMemo, useState } from 'react';

export type SelectionCheckState = 'all' | 'some' | 'none';

type SelectAllStatus = 'idle' | 'loadingRemainingItems' | 'remainingItemsLoaded';

interface UseDriveSelectionParams {
  folderItemUuids: string[];
  visibleItemUuids: string[];
  hasUnloadedItems: boolean;
  loadRemainingItems: () => Promise<void>;
}

export interface DriveSelection {
  isSelectionMode: boolean;
  isSelectingAll: boolean;
  selectedUuids: Set<string>;
  selectionCheckState: SelectionCheckState;
  enterSelectionMode: (uuid?: string) => void;
  exitSelectionMode: () => void;
  toggleSelection: (uuid: string) => void;
  toggleSelectAll: () => Promise<void>;
}

export const getSelectionCheckState = (
  selectedUuids: Set<string>,
  visibleItemUuids: string[],
  hasUnloadedItems: boolean,
): SelectionCheckState => {
  const selectedVisibleCount = visibleItemUuids.filter((uuid) => selectedUuids.has(uuid)).length;
  if (selectedVisibleCount === 0) {
    return 'none';
  }
  const isEveryItemSelected = !hasUnloadedItems && selectedVisibleCount === visibleItemUuids.length;
  return isEveryItemSelected ? 'all' : 'some';
};

/**
 * Keeps the items selected in a Drive folder. Selecting all marks every item in `visibleItemUuids`, after
 * `loadRemainingItems` when `hasUnloadedItems` is set, and adds them to what is already selected; if items are
 * still unloaded once `loadRemainingItems` resolves, nothing is added. Selected uuids that leave
 * `folderItemUuids` are dropped. `toggleSelectAll` rejects with the error of `loadRemainingItems`.
 */
export const useDriveSelection = ({
  folderItemUuids,
  visibleItemUuids,
  hasUnloadedItems,
  loadRemainingItems,
}: UseDriveSelectionParams): DriveSelection => {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectAllStatus, setSelectAllStatus] = useState<SelectAllStatus>('idle');
  const [selectedUuids, setSelectedUuids] = useState<Set<string>>(() => new Set());

  const selectionCheckState = useMemo(
    () => getSelectionCheckState(selectedUuids, visibleItemUuids, hasUnloadedItems),
    [selectedUuids, visibleItemUuids, hasUnloadedItems],
  );

  const selectVisibleItems = () => {
    setSelectedUuids((previousUuids) => new Set([...previousUuids, ...visibleItemUuids]));
  };

  useEffect(() => {
    const folderItemUuidSet = new Set(folderItemUuids);
    setSelectedUuids((previousUuids) => {
      const keptUuids = [...previousUuids].filter((uuid) => folderItemUuidSet.has(uuid));
      return keptUuids.length === previousUuids.size ? previousUuids : new Set(keptUuids);
    });
  }, [folderItemUuids]);

  useEffect(() => {
    if (selectAllStatus !== 'remainingItemsLoaded') {
      return;
    }
    if (!hasUnloadedItems) {
      selectVisibleItems();
    }
    setSelectAllStatus('idle');
  }, [selectAllStatus, hasUnloadedItems, visibleItemUuids]);

  const enterSelectionMode = (uuid?: string) => {
    setIsSelectionMode(true);
    setSelectedUuids(uuid ? new Set([uuid]) : new Set());
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectAllStatus('idle');
    setSelectedUuids(new Set());
  };

  const toggleSelection = (uuid: string) => {
    setSelectedUuids((previousUuids) => {
      const updatedUuids = new Set(previousUuids);
      if (updatedUuids.has(uuid)) {
        updatedUuids.delete(uuid);
      } else {
        updatedUuids.add(uuid);
      }
      return updatedUuids;
    });
  };

  const toggleSelectAll = async () => {
    if (selectionCheckState === 'all') {
      setSelectedUuids(new Set());
      return;
    }
    if (!hasUnloadedItems) {
      selectVisibleItems();
      return;
    }

    setSelectAllStatus('loadingRemainingItems');
    try {
      await loadRemainingItems();
    } catch (error) {
      setSelectAllStatus('idle');
      throw error;
    }
    setSelectAllStatus((currentStatus) => (currentStatus === 'idle' ? 'idle' : 'remainingItemsLoaded'));
  };

  return {
    isSelectionMode,
    isSelectingAll: selectAllStatus !== 'idle',
    selectedUuids,
    selectionCheckState,
    enterSelectionMode,
    exitSelectionMode,
    toggleSelection,
    toggleSelectAll,
  };
};
