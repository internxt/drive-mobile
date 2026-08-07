import { useCallback, useMemo, useState } from 'react';
import { BackfilledThumbnailRefs } from 'src/services/photos/PhotoThumbnailBackfillService';
import { TimelinePhotoItem } from '../../PhotosScreen/types';

const withBackedUpOverride = (item: TimelinePhotoItem, backedUpIds: Set<string>): TimelinePhotoItem => {
  if (item.type === 'local' && backedUpIds.has(item.id)) {
    return { ...item, backupState: 'backed' as const };
  }
  return item;
};

const withThumbnailBackfillOverride = (
  item: TimelinePhotoItem,
  backfilledThumbnails: Map<string, BackfilledThumbnailRefs>,
): TimelinePhotoItem => {
  const thumbnailRefs = backfilledThumbnails.get(item.id);
  if (item.type === 'cloud-only' && thumbnailRefs) {
    return { ...item, ...thumbnailRefs };
  }
  return item;
};

export interface UsePreviewItemsResult {
  items: TimelinePhotoItem[];
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  markAssetBackedUp: (id: string) => void;
  markThumbnailBackfilled: (id: string, refs: BackfilledThumbnailRefs) => void;
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
  const [backfilledThumbnails, setBackfilledThumbnails] = useState<Map<string, BackfilledThumbnailRefs>>(new Map());

  const overriddenItems = useMemo(() => {
    if (backedUpIds.size === 0 && backfilledThumbnails.size === 0) {
      return items;
    }
    return items.map((item) =>
      withThumbnailBackfillOverride(withBackedUpOverride(item, backedUpIds), backfilledThumbnails),
    );
  }, [items, backedUpIds, backfilledThumbnails]);

  const markAssetBackedUp = useCallback((id: string) => {
    setBackedUpIds((prev) => new Set(prev).add(id));
  }, []);

  const markThumbnailBackfilled = useCallback((id: string, refs: BackfilledThumbnailRefs) => {
    setBackfilledThumbnails((prev) => new Map(prev).set(id, refs));
  }, []);

  return { items: overriddenItems, currentIndex, setCurrentIndex, markAssetBackedUp, markThumbnailBackfilled };
};
