import { useCallback, useMemo, useState } from 'react';
import { TimelinePhotoItem } from '../../PhotosScreen/types';

export interface UsePreviewItemsResult {
  items: TimelinePhotoItem[];
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  markAssetBackedUp: (id: string) => void;
}

export const usePreviewItems = (initialId: string, items: TimelinePhotoItem[]): UsePreviewItemsResult => {
  const initialIndex = useMemo(
    () =>
      Math.max(
        0,
        items.findIndex((item) => item.id === initialId),
      ),
    [initialId, items],
  );
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [backedUpIds, setBackedUpIds] = useState<Set<string>>(new Set());

  const overriddenItems = useMemo(
    () =>
      backedUpIds.size === 0
        ? items
        : items.map((item) =>
            item.type === 'local' && backedUpIds.has(item.id) ? { ...item, backupState: 'backed' as const } : item,
          ),
    [items, backedUpIds],
  );

  const markAssetBackedUp = useCallback((id: string) => {
    setBackedUpIds((prev) => new Set(prev).add(id));
  }, []);

  return { items: overriddenItems, currentIndex, setCurrentIndex, markAssetBackedUp };
};
