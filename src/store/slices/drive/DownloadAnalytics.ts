import { AnalyticsService, DriveAnalyticsEvent } from '../../../services/AnalyticsService';

export interface FileInfo {
  id: number;
  size: number;
  type: string;
  parentId: number;
}

export class DownloadAnalytics {
  constructor(private analytics: AnalyticsService) {}

  trackStart(fileInfo: FileInfo) {
    return this.analytics.track(DriveAnalyticsEvent.FileDownloadStarted, {
      file_id: fileInfo.id,
      size: fileInfo.size,
      type: fileInfo.type,
      parent_folder_id: fileInfo.parentId,
    });
  }

  trackSuccess(fileInfo: FileInfo) {
    return this.analytics.track(DriveAnalyticsEvent.FileDownloadCompleted, {
      file_id: fileInfo.id,
      size: fileInfo.size,
      type: fileInfo.type,
      parent_folder_id: fileInfo.parentId,
    });
  }

  trackError(fileInfo: FileInfo) {
    return this.analytics.track(DriveAnalyticsEvent.FileDownloadError, {
      file_id: fileInfo.id,
      size: fileInfo.size,
      type: fileInfo.type,
      parent_folder_id: fileInfo.parentId,
    });
  }
}
