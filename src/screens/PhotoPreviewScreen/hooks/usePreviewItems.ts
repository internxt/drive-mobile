import { useMemo, useState } from 'react';
import { TimelinePhotoItem } from '../../PhotosScreen/types';

export interface UsePreviewItemsResult {
  items: TimelinePhotoItem[];
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
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
  return { items, currentIndex, setCurrentIndex };
};
