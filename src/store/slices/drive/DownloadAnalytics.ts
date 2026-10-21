import { AnalyticsService, DriveAnalyticsEvent } from '../../../services/AnalyticsService';

export interface FileInfo {
  uuid: string;
  size: number;
  type: string;
  folderUuid?: string;
}

export class DownloadAnalytics {
  constructor(private readonly analytics: AnalyticsService) {}

  trackStart(fileInfo: FileInfo) {
    return this.analytics.track(DriveAnalyticsEvent.FileDownloadStarted, {
      file_uuid: fileInfo.uuid,
      size: fileInfo.size,
      type: fileInfo.type,
      parent_folder_uuid: fileInfo.folderUuid,
    });
  }

  trackSuccess(fileInfo: FileInfo) {
    return this.analytics.track(DriveAnalyticsEvent.FileDownloadCompleted, {
      file_uuid: fileInfo.uuid,
      size: fileInfo.size,
      type: fileInfo.type,
      parent_folder_uuid: fileInfo.folderUuid,
    });
  }

  trackError(fileInfo: FileInfo) {
    return this.analytics.track(DriveAnalyticsEvent.FileDownloadError, {
      file_uuid: fileInfo.uuid,
      size: fileInfo.size,
      type: fileInfo.type,
      parent_folder_uuid: fileInfo.folderUuid,
    });
  }
}
