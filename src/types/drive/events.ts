/**
 * Drive domain events
 * Used for event-driven communication between components
 */
export enum DriveEventKey {
  DownloadCompleted = 'download-completed',
  DownloadError = 'download-error',
  DownloadFinally = 'download-finally',
  CancelDownload = 'cancel-download',
  CancelDownloadEnd = 'cancel-download-end',
  UploadCompleted = 'upload-completed',
  SharedLinksUpdated = 'shared-links-updated',
  DriveItemTrashed = 'drive-item-trashed',
  DriveItemRestored = 'drive-item-restored',
}
