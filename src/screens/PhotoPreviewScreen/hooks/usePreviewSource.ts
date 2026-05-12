import { useEffect, useRef, useState } from 'react';
import { PhotoFullImageService } from '../../../services/photos/PhotoFullImageService';
import { TimelinePhotoItem } from '../../PhotosScreen/types';

export interface UsePreviewSourceResult {
  uri: string | null;
}

export const usePreviewSource = (item: TimelinePhotoItem): UsePreviewSourceResult => {
  const thumbnailUri = item.type === 'cloud-only' ? item.thumbnailPath : (item.uri ?? null);
  const [uri, setUri] = useState<string | null>(thumbnailUri);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setUri(thumbnailUri);

    PhotoFullImageService.getFullImageUri(item, controller.signal).then((fullUri) => {
      if (!controller.signal.aborted) {
        setUri(fullUri ?? thumbnailUri);
      }
    });

    return () => {
      controller.abort();
    };
  }, [item.id, thumbnailUri]);

  return { uri };
};
