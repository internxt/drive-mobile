import { AnalyticsService, DriveAnalyticsEvent } from '../../../services/AnalyticsService';

export interface FileInfo {
  uuid: string;
  size: number;
  type: string;
  parentId: number;
}

export class DownloadAnalytics {
  constructor(private readonly analytics: AnalyticsService) {}

  trackStart(fileInfo: FileInfo) {
    return this.analytics.track(DriveAnalyticsEvent.FileDownloadStarted, {
      file_uuid: fileInfo.uuid,
      size: fileInfo.size,
      type: fileInfo.type,
      parent_folder_id: fileInfo.parentId,
    });
  }

  trackSuccess(fileInfo: FileInfo) {
    return this.analytics.track(DriveAnalyticsEvent.FileDownloadCompleted, {
      file_uuid: fileInfo.uuid,
      size: fileInfo.size,
      type: fileInfo.type,
      parent_folder_id: fileInfo.parentId,
    });
  }

  trackError(fileInfo: FileInfo) {
    return this.analytics.track(DriveAnalyticsEvent.FileDownloadError, {
      file_uuid: fileInfo.uuid,
      size: fileInfo.size,
      type: fileInfo.type,
      parent_folder_id: fileInfo.parentId,
    });
  }
}
