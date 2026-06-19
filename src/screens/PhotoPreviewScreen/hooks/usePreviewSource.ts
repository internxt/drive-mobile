import { useEffect, useRef, useState } from 'react';
import { logger } from 'src/services/common';
import { PhotoAssetFetchService } from '../../../services/photos/PhotoAssetFetchService';
import { TimelinePhotoItem } from '../../PhotosScreen/types';

export interface UsePreviewSourceResult {
  uri: string | null;
  thumbnailUri: string | null;
  isLoading: boolean;
}

export const usePreviewSource = (item: TimelinePhotoItem, isScrubbing: boolean): UsePreviewSourceResult => {
  const thumbnailUri = item.type === 'cloud-only' ? item.thumbnailPath : (item.uri ?? null);
  const [uri, setUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isScrubbing) {
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setUri(null);
    setIsLoading(true);
    logger.info(`[usePreviewSource] fetching asset — id: ${item.id}, type: ${item.type}, mediaType: ${item.mediaType}`);

    PhotoAssetFetchService.fetchPlaybackUri(item, controller.signal).then((fullUri) => {
      if (!controller.signal.aborted) {
        logger.info(`[usePreviewSource] asset ready — id: ${item.id}, uri: ${fullUri ?? 'null'}`);
        setUri(fullUri ?? null);
        setIsLoading(false);
      }
    });

    return () => {
      controller.abort();
    };
  }, [item.id, isScrubbing]);

  return { uri, thumbnailUri, isLoading };
};
