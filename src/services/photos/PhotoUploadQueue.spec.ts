import * as MediaLibrary from 'expo-media-library';
import { AssetUploadJob, PhotoUploadQueue } from './PhotoUploadQueue';
import { PhotoUploadService } from './PhotoUploadService';

jest.mock('./PhotoUploadService', () => ({
  PhotoUploadService: {
    upload: jest.fn(),
    replace: jest.fn(),
  },
}));

const mockUpload = PhotoUploadService.upload as jest.Mock;
const mockReplace = PhotoUploadService.replace as jest.Mock;

const makeAsset = (id: string): MediaLibrary.Asset =>
  ({
    id,
    filename: `${id}.jpg`,
    uri: `file:///${id}.jpg`,
    mediaType: MediaLibrary.MediaType.photo,
    creationTime: Date.now(),
    modificationTime: Date.now(),
    duration: 0,
    width: 100,
    height: 100,
  }) as MediaLibrary.Asset;

const DEVICE_ID = 'device-123';
const PHOTOS_BUCKET = 'photos-bucket-456';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PhotoUploadQueue.start', () => {
  test('when a job succeeds, then the caller is notified of the start and completion with the asset id and remote file id', async () => {
    const asset = makeAsset('a1');
    mockUpload.mockResolvedValue('remote-file-id');

    const onAssetStart = jest.fn();
    const onAssetDone = jest.fn();

    await PhotoUploadQueue.start([{ asset }], DEVICE_ID, PHOTOS_BUCKET, { onAssetStart, onAssetDone });

    expect(onAssetStart).toHaveBeenCalledWith('a1');
    expect(onAssetDone).toHaveBeenCalledWith('a1', 'remote-file-id', asset.modificationTime);
  });

  test('when a job fails, then the caller is notified of the failure with the asset id and the error', async () => {
    const asset = makeAsset('a1');
    const error = new Error('network error');
    mockUpload.mockRejectedValue(error);

    const onAssetError = jest.fn();

    await PhotoUploadQueue.start([{ asset }], DEVICE_ID, PHOTOS_BUCKET, { onAssetError });

    expect(onAssetError).toHaveBeenCalledWith('a1', error);
  });

  test('when one job fails and another succeeds, then both the failure and completion callbacks are called and the queue finishes', async () => {
    const a1 = makeAsset('a1');
    const a2 = makeAsset('a2');
    mockUpload.mockRejectedValueOnce(new Error('fail')).mockResolvedValueOnce('remote-id');

    const onAssetDone = jest.fn();
    const onAssetError = jest.fn();

    await PhotoUploadQueue.start([{ asset: a1 }, { asset: a2 }], DEVICE_ID, PHOTOS_BUCKET, {
      onAssetDone,
      onAssetError,
    });

    expect(onAssetError).toHaveBeenCalledWith('a1', expect.any(Error));
    expect(onAssetDone).toHaveBeenCalledWith('a2', 'remote-id', a2.modificationTime);
  });

  test('when a job has an existing remote file id, then the existing cloud file is overwritten rather than creating a new one', async () => {
    const asset = makeAsset('a1');
    const job: AssetUploadJob = { asset, existingRemoteFileId: 'existing-remote-id' };
    mockReplace.mockResolvedValue('existing-remote-id');

    const onAssetDone = jest.fn();

    await PhotoUploadQueue.start([job], DEVICE_ID, PHOTOS_BUCKET, { onAssetDone });

    expect(mockReplace).toHaveBeenCalledWith(
      asset,
      'existing-remote-id',
      DEVICE_ID,
      PHOTOS_BUCKET,
      expect.objectContaining({ onProgress: expect.any(Function), signal: expect.any(AbortSignal) }),
    );
    expect(mockUpload).not.toHaveBeenCalled();
    expect(onAssetDone).toHaveBeenCalledWith('a1', 'existing-remote-id', asset.modificationTime);
  });

  test('when the job list is empty, then no callbacks are called and the queue completes', async () => {
    const onAssetStart = jest.fn();
    const onAssetDone = jest.fn();

    await expect(
      PhotoUploadQueue.start([], DEVICE_ID, PHOTOS_BUCKET, { onAssetStart, onAssetDone }),
    ).resolves.toBeUndefined();
    expect(onAssetStart).not.toHaveBeenCalled();
    expect(onAssetDone).not.toHaveBeenCalled();
  });

  test('when all jobs succeed, then the caller is notified of completion once per job', async () => {
    const jobs = ['a1', 'a2', 'a3'].map((id) => ({ asset: makeAsset(id) }));
    mockUpload.mockResolvedValue('remote-id');

    const onAssetDone = jest.fn();

    await PhotoUploadQueue.start(jobs, DEVICE_ID, PHOTOS_BUCKET, { onAssetDone });

    expect(onAssetDone).toHaveBeenCalledTimes(3);
  });

  test('when upload is called, then the abort signal is passed to the upload service', async () => {
    const asset = makeAsset('a1');
    mockUpload.mockResolvedValue('remote-id');

    await PhotoUploadQueue.start([{ asset }], DEVICE_ID, PHOTOS_BUCKET, {});

    expect(mockUpload).toHaveBeenCalledWith(
      asset,
      DEVICE_ID,
      PHOTOS_BUCKET,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});

describe('PhotoUploadQueue.abortAll', () => {
  test('when the upload service rejects with an abort error, then onAssetError receives the original abort error and not a wrapped error', async () => {
    const asset = makeAsset('a1');
    const abortError = new Error('AbortError');
    abortError.name = 'AbortError';
    mockUpload.mockImplementationOnce(async () => {
      PhotoUploadQueue.abortAll();
      throw abortError;
    });

    const onAssetError = jest.fn();
    await PhotoUploadQueue.start([{ asset }], DEVICE_ID, PHOTOS_BUCKET, { onAssetError });

    expect(onAssetError).toHaveBeenCalledWith('a1', abortError);
    expect((onAssetError.mock.calls[0][1] as Error).name).toBe('AbortError');
  });

  test('when abort all is called mid run, then subsequent jobs are skipped via the abort signal', async () => {
    const asset = makeAsset('a1');
    mockUpload.mockImplementationOnce(async () => {
      PhotoUploadQueue.abortAll();
      return 'remote-id';
    });

    const onAssetStart = jest.fn();
    const secondAsset = makeAsset('a2');
    mockUpload.mockResolvedValueOnce('remote-id-2');

    await PhotoUploadQueue.start([{ asset }, { asset: secondAsset }], DEVICE_ID, PHOTOS_BUCKET, { onAssetStart });

    // First job ran, second was skipped because signal was aborted after first job
    expect(onAssetStart).toHaveBeenCalledWith('a1');
    expect(onAssetStart).not.toHaveBeenCalledWith('a2');
    expect(mockUpload).toHaveBeenCalledTimes(1);
  });

  test('when start is called again after abort, then a fresh abort signal is created for each run', async () => {
    const asset = makeAsset('a1');
    mockUpload.mockResolvedValue('remote-id');

    // First run — capture the signal that gets passed
    await PhotoUploadQueue.start([{ asset }], DEVICE_ID, PHOTOS_BUCKET, {});
    const firstSignal = (mockUpload.mock.calls[0] as [unknown, unknown, unknown, { signal: AbortSignal }])[3].signal;

    // Abort and start a second run
    PhotoUploadQueue.abortAll();
    jest.clearAllMocks();
    mockUpload.mockResolvedValue('remote-id');
    await PhotoUploadQueue.start([{ asset }], DEVICE_ID, PHOTOS_BUCKET, {});
    const secondSignal = (mockUpload.mock.calls[0] as [unknown, unknown, unknown, { signal: AbortSignal }])[3].signal;

    expect(secondSignal).toBeDefined();
    expect(secondSignal.aborted).toBe(false);
    // The second run must receive a different signal instance from the first
    expect(secondSignal).not.toBe(firstSignal);
  });
});
