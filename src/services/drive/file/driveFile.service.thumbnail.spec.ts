import fileSystemService from '@internxt-mobile/services/FileSystemService';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { Image } from 'react-native';
import * as networkDownload from 'src/network/download';
import { driveFileService } from './driveFile.service';

jest.mock('src/network/download', () => ({
  downloadThumbnail: jest.fn(),
}));

jest.mock('src/lib/network', () => ({
  getEnvironmentConfigFromUser: () => ({ bridgeUser: 'bridge-user', bridgePass: 'bridge-pass', encryptionKey: 'key' }),
}));

const THUMBNAIL_WIDTH = 256;
const THUMBNAIL_HEIGHT = 192;

const thumbnail = {
  bucket_id: 'bucket-1',
  bucket_file: 'thumbnail-file-1',
  bucketFile: 'thumbnail-file-1',
  bucketId: 'bucket-1',
  type: 'png',
};
const user = {} as UserSettings;

const downloadThumbnailMock = networkDownload.downloadThumbnail as jest.Mock;

describe('Downloading a thumbnail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(fileSystemService, 'exists').mockResolvedValue(false);
    jest.spyOn(Image, 'getSize').mockImplementation((_uri, onSuccess) => onSuccess(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT));
  });

  test('when the same thumbnail is requested twice at once, then it is downloaded only once', async () => {
    let finishDownload: () => void = () => undefined;
    downloadThumbnailMock.mockReturnValue(
      new Promise<void>((resolve) => {
        finishDownload = resolve;
      }),
    );

    const firstRequest = driveFileService.getThumbnail(thumbnail, user);
    const secondRequest = driveFileService.getThumbnail(thumbnail, user);
    finishDownload();
    const [firstThumbnail, secondThumbnail] = await Promise.all([firstRequest, secondRequest]);

    expect(downloadThumbnailMock).toHaveBeenCalledTimes(1);
    expect(firstThumbnail).toEqual(secondThumbnail);
    expect(firstThumbnail).toMatchObject({ width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT });
  });

  test('when a shared download fails, then both requests fail and the next request downloads again', async () => {
    downloadThumbnailMock.mockRejectedValueOnce(new Error('Download failed'));

    const firstRequest = driveFileService.getThumbnail(thumbnail, user);
    const secondRequest = driveFileService.getThumbnail(thumbnail, user);

    await expect(firstRequest).rejects.toThrow('Download failed');
    await expect(secondRequest).rejects.toThrow('Download failed');

    downloadThumbnailMock.mockResolvedValueOnce(undefined);
    await driveFileService.getThumbnail(thumbnail, user);

    expect(downloadThumbnailMock).toHaveBeenCalledTimes(2);
  });

  test('when the thumbnail is already on the device, then it is not downloaded', async () => {
    jest.spyOn(fileSystemService, 'exists').mockResolvedValue(true);

    await driveFileService.getThumbnail(thumbnail, user);

    expect(downloadThumbnailMock).not.toHaveBeenCalled();
  });
});
