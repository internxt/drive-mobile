import { useEffect, useRef, useState } from 'react';
import { PhotoAssetFetchService } from '../../../services/photos/PhotoAssetFetchService';
import { TimelinePhotoItem } from '../../PhotosScreen/types';

export interface UsePreviewSourceResult {
  uri: string | null | undefined;
  thumbnailUri: string | null;
}

export const usePreviewSource = (item: TimelinePhotoItem): UsePreviewSourceResult => {
  const thumbnailUri = item.type === 'cloud-only' ? item.thumbnailPath : (item.uri ?? null);
  const [uri, setUri] = useState<string | null | undefined>(thumbnailUri ?? undefined);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setUri(thumbnailUri ?? undefined);

    PhotoAssetFetchService.fetchUri(item, controller.signal).then((fullUri) => {
      if (!controller.signal.aborted) {
        setUri(fullUri ?? thumbnailUri ?? null);
      }
    });

    return () => {
      controller.abort();
    };
  }, [item.id, thumbnailUri]);

  return { uri, thumbnailUri };
};
