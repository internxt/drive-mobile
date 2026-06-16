import { useEffect, useState } from 'react';
import { photosLocalDB } from 'src/services/photos/database/photosLocalDB';
import { useAppSelector } from 'src/store/hooks';
import { TimelinePhotoItem } from '../../PhotosScreen/types';

export interface BurstLiveProgress {
  uploaded: number;
  total: number;
}

export interface LiveBackupStatus {
  isWaitingToUpload: boolean;
  isUploading: boolean;
  progress: number;
  isBurst: boolean;
  burstLiveProgress: BurstLiveProgress | null;
  burstTotal: number | null;
}

/**
 * Overlays live upload state from the Redux store on top of a frozen preview snapshot.
 *
 * The preview receives its items as a snapshot, so `item.backupState` is frozen
 * at navigation time. This hook tracks the asset's live state instead, so the header reacts while
 * the preview stays open: not-backed → uploading (with progress) → backed. For burst
 * representatives it also resolves the member count — from the live `burstUploadProgressById`
 * while uploading, or from `asset_sync.burstMemberCount` (read once via `photosLocalDB.getStatus`)
 * once backed.
 *
 * @param item The currently displayed preview item, or `undefined` while there is none yet.
 * @returns Live backup status for the header (waiting/uploading/progress), plus burst-specific
 *   fields (`isBurst`, `burstLiveProgress`, `burstTotal`).
 */
export const useLiveBackupStatus = (item: TimelinePhotoItem | undefined): LiveBackupStatus => {
  const [dbBurstTotal, setDbBurstTotal] = useState<number | null>(null);

  const assetId = item?.type === 'local' ? item.id : undefined;
  const isBurst = item?.type === 'local' ? (item.isBurst ?? false) : false;

  const isInUploadQueue = useAppSelector((state) =>
    assetId ? state.photos.uploadingAssetIds.includes(assetId) : false,
  );
  const progress = useAppSelector((state) => (assetId ? (state.photos.uploadProgressById[assetId] ?? 0) : 0));
  const completedDuringSession = useAppSelector((state) =>
    assetId ? state.photos.sessionCompletedAssetIds.includes(assetId) : false,
  );
  const burstLiveProgress = useAppSelector((state) =>
    assetId ? (state.photos.burstUploadProgressById[assetId] ?? null) : null,
  );

  const snapshotState = item?.type === 'local' ? item.backupState : undefined;
  const isWaitingToUpload = snapshotState === 'not-backed' && !isInUploadQueue && !completedDuringSession;

  useEffect(() => {
    if (!isBurst || !assetId || isInUploadQueue) {
      setDbBurstTotal(null);
      return;
    }
    let isCurrent = true;
    photosLocalDB
      .getStatus(assetId)
      .then((entry) => {
        if (isCurrent && entry?.burstMemberCount != null) {
          setDbBurstTotal(entry.burstMemberCount + 1);
        }
      })
      .catch(() => undefined);
    return () => {
      isCurrent = false;
    };
  }, [assetId, isBurst, isInUploadQueue]);

  const burstTotal = isInUploadQueue ? (burstLiveProgress?.total ?? null) : dbBurstTotal;

  return {
    isUploading: isInUploadQueue,
    isWaitingToUpload,
    progress: isInUploadQueue ? progress : 0,
    isBurst,
    burstLiveProgress: isInUploadQueue ? burstLiveProgress : null,
    burstTotal,
  };
};
