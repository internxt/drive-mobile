import { useAppSelector } from 'src/store/hooks';
import { TimelinePhotoItem } from '../../PhotosScreen/types';

export interface LiveBackupStatus {
  isWaitingToUpload: boolean;
  isUploading: boolean;
  progress: number;
}

export const useLiveBackupStatus = (item: TimelinePhotoItem | undefined): LiveBackupStatus => {
  const assetId = item?.type === 'local' ? item.id : undefined;

  const isInUploadQueue = useAppSelector((state) =>
    assetId ? state.photos.uploadingAssetIds.includes(assetId) : false,
  );
  const progress = useAppSelector((state) => (assetId ? (state.photos.uploadProgressById[assetId] ?? 0) : 0));
  const completedDuringSession = useAppSelector((state) =>
    assetId ? state.photos.sessionCompletedAssetIds.includes(assetId) : false,
  );

  const snapshotState = item?.type === 'local' ? item.backupState : undefined;
  const isWaitingToUpload = snapshotState === 'not-backed' && !isInUploadQueue && !completedDuringSession;

  return {
    isUploading: isInUploadQueue,
    isWaitingToUpload,
    progress: isInUploadQueue ? progress : 0,
  };
};
