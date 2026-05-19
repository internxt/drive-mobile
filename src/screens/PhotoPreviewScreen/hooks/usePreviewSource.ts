import { useEffect, useRef, useState } from 'react';
import { logger } from 'src/services/common';
import { PhotoAssetFetchService } from '../../../services/photos/PhotoAssetFetchService';
import { TimelinePhotoItem } from '../../PhotosScreen/types';

export interface UsePreviewSourceResult {
  uri: string | null | undefined;
  thumbnailUri: string | null;
}

export const usePreviewSource = (item: TimelinePhotoItem): UsePreviewSourceResult => {
  const thumbnailUri = item.type === 'cloud-only' ? item.thumbnailPath : (item.uri ?? null);
  const [uri, setUri] = useState<string | null | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setUri(undefined);
    logger.info(`[usePreviewSource] fetching asset — id: ${item.id}, type: ${item.type}, mediaType: ${item.mediaType}`);

    PhotoAssetFetchService.fetchUri(item, controller.signal).then((fullUri) => {
      if (!controller.signal.aborted) {
        logger.info(`[usePreviewSource] asset ready — id: ${item.id}, uri: ${fullUri ?? 'null'}`);
        setUri(fullUri ?? null);
      }
    });

    return () => {
      controller.abort();
    };
  }, [item.id]);

  return { uri, thumbnailUri };
};
