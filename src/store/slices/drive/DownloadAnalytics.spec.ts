import { AnalyticsService } from '../../../services/AnalyticsService';
import { DownloadAnalytics } from './DownloadAnalytics';

jest.mock('../../../services/AnalyticsService', () => ({
  DriveAnalyticsEvent: {
    FileDownloadStarted: 'File Download Started',
    FileDownloadCompleted: 'File Download Completed',
    FileDownloadError: 'File Download Error',
  },
}));

const downloadedFile = { uuid: 'file-1', size: 10, type: 'pdf', folderUuid: 'folder-1' };

describe('Tracking a file download', () => {
  test('when a download starts, ends or fails, then each event names the folder that holds the file', () => {
    const track = jest.fn();
    const downloadAnalytics = new DownloadAnalytics({ track } as unknown as AnalyticsService);

    downloadAnalytics.trackStart(downloadedFile);
    downloadAnalytics.trackSuccess(downloadedFile);
    downloadAnalytics.trackError(downloadedFile);

    expect(track).toHaveBeenCalledTimes(3);
    for (const [, eventProperties] of track.mock.calls) {
      expect(eventProperties).toStrictEqual({
        file_uuid: 'file-1',
        size: 10,
        type: 'pdf',
        parent_folder_uuid: 'folder-1',
      });
    }
  });
});
