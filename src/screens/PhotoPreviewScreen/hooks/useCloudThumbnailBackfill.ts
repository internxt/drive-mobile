import { useEffect, useRef } from 'react';
import { logger } from 'src/services/common';
import { PhotoThumbnailBackfillService } from 'src/services/photos/PhotoThumbnailBackfillService';
import { useAppDispatch } from 'src/store/hooks';
import { photosActions } from 'src/store/slices/photos';
import { TimelinePhotoItem } from '../../PhotosScreen/types';
import { usePreviewThumbnailBackfillContext } from '../context/PreviewThumbnailBackfillContext';

/**
 * Backfills a missing thumbnail for a cloud-only item once its full asset has finished
 * downloading in the preview. Runs at most once per mounted preview page.
 *
 * @param item - Timeline item currently shown in the preview page.
 * @param uri - Local URI of the already-downloaded full asset, or `null` while it's still loading.
 */
export const useCloudThumbnailBackfill = (item: TimelinePhotoItem, uri: string | null): void => {
  const dispatch = useAppDispatch();
  const { onThumbnailBackfilled } = usePreviewThumbnailBackfillContext();
  const backfillAttempted = useRef<string | null>(null);

  useEffect(() => {
    // item.thumbnailBucketFile guards against re-firing after a *successful* backfill already
    // updated the item; backfillAttempted guards against re-firing while a fetch is in flight or
    // after a failed/null result, before the item itself has changed.
    if (!uri || item.type !== 'cloud-only' || item.thumbnailBucketFile) {
      return;
    }
    if (backfillAttempted.current === item.id) {
      return;
    }
    backfillAttempted.current = item.id;

    PhotoThumbnailBackfillService.backfillCloudThumbnail({ item, localUri: uri })
      .then((refs) => {
        if (refs) {
          onThumbnailBackfilled(item.id, refs);
          dispatch(photosActions.incrementCloudFetchRevision());
        }
      })
      .catch((error) => {
        logger.error(`[useCloudThumbnailBackfill] Unexpected error backfilling thumbnail for ${item.id}: ${error}`);
      });
  }, [item, uri, dispatch, onThumbnailBackfilled]);
};
