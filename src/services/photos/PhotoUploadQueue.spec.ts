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

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PhotoUploadQueue.start', () => {
  test('when a job succeeds, then onAssetStart and onAssetDone are called with the asset id and remote file id', async () => {
    const asset = makeAsset('a1');
    mockUpload.mockResolvedValue('remote-file-id');

    const onAssetStart = jest.fn();
    const onAssetDone = jest.fn();

    await PhotoUploadQueue.start([{ asset }], DEVICE_ID, { onAssetStart, onAssetDone });

    expect(onAssetStart).toHaveBeenCalledWith('a1');
    expect(onAssetDone).toHaveBeenCalledWith('a1', 'remote-file-id', asset.modificationTime);
  });

  test('when a job fails, then onAssetError is called with the asset id and the error', async () => {
    const asset = makeAsset('a1');
    const error = new Error('network error');
    mockUpload.mockRejectedValue(error);

    const onAssetError = jest.fn();

    await PhotoUploadQueue.start([{ asset }], DEVICE_ID, { onAssetError });

    expect(onAssetError).toHaveBeenCalledWith('a1', error);
  });

  test('when one job fails and another succeeds, then both callbacks are called and the queue completes', async () => {
    const a1 = makeAsset('a1');
    const a2 = makeAsset('a2');
    mockUpload.mockRejectedValueOnce(new Error('fail')).mockResolvedValueOnce('remote-id');

    const onAssetDone = jest.fn();
    const onAssetError = jest.fn();

    await PhotoUploadQueue.start([{ asset: a1 }, { asset: a2 }], DEVICE_ID, { onAssetDone, onAssetError });

    expect(onAssetError).toHaveBeenCalledWith('a1', expect.any(Error));
    expect(onAssetDone).toHaveBeenCalledWith('a2', 'remote-id', a2.modificationTime);
  });

  test('when a job has an existing remote file id, then replace is called instead of upload', async () => {
    const asset = makeAsset('a1');
    const job: AssetUploadJob = { asset, existingRemoteFileId: 'existing-remote-id' };
    mockReplace.mockResolvedValue('existing-remote-id');

    const onAssetDone = jest.fn();

    await PhotoUploadQueue.start([job], DEVICE_ID, { onAssetDone });

    expect(mockReplace).toHaveBeenCalledWith(
      asset,
      'existing-remote-id',
      DEVICE_ID,
      expect.any(Function),
      expect.any(AbortSignal),
    );
    expect(mockUpload).not.toHaveBeenCalled();
    expect(onAssetDone).toHaveBeenCalledWith('a1', 'existing-remote-id', asset.modificationTime);
  });

  test('when the job list is empty, then no callbacks are called and the queue completes', async () => {
    const onAssetStart = jest.fn();
    const onAssetDone = jest.fn();

    await expect(PhotoUploadQueue.start([], DEVICE_ID, { onAssetStart, onAssetDone })).resolves.toBeUndefined();
    expect(onAssetStart).not.toHaveBeenCalled();
    expect(onAssetDone).not.toHaveBeenCalled();
  });

  test('when all jobs succeed, then onAssetDone is called once per job', async () => {
    const jobs = ['a1', 'a2', 'a3'].map((id) => ({ asset: makeAsset(id) }));
    mockUpload.mockResolvedValue('remote-id');

    const onAssetDone = jest.fn();

    await PhotoUploadQueue.start(jobs, DEVICE_ID, { onAssetDone });

    expect(onAssetDone).toHaveBeenCalledTimes(3);
  });

  test('when upload is called, then the abort signal is passed to the upload service', async () => {
    const asset = makeAsset('a1');
    mockUpload.mockResolvedValue('remote-id');

    await PhotoUploadQueue.start([{ asset }], DEVICE_ID, {});

    expect(mockUpload).toHaveBeenCalledWith(asset, DEVICE_ID, expect.any(Function), expect.any(AbortSignal));
  });
});

describe('PhotoUploadQueue.abortAll', () => {
  test('when abort all is called mid run, then subsequent jobs are skipped via the abort signal', async () => {
    const asset = makeAsset('a1');
    mockUpload.mockImplementationOnce(async () => {
      PhotoUploadQueue.abortAll();
      return 'remote-id';
    });

    const onAssetStart = jest.fn();
    const secondAsset = makeAsset('a2');
    mockUpload.mockResolvedValueOnce('remote-id-2');

    await PhotoUploadQueue.start([{ asset }, { asset: secondAsset }], DEVICE_ID, { onAssetStart });

    // First job ran, second was skipped because signal was aborted after first job
    expect(onAssetStart).toHaveBeenCalledWith('a1');
    expect(onAssetStart).not.toHaveBeenCalledWith('a2');
  });

  test('when start is called again after abort, then a fresh abort signal is created', async () => {
    const asset = makeAsset('a1');
    mockUpload.mockResolvedValue('remote-id');

    PhotoUploadQueue.abortAll();
    await PhotoUploadQueue.start([{ asset }], DEVICE_ID, {});

    const passedSignal = (mockUpload.mock.calls[0] as [unknown, unknown, unknown, AbortSignal])[3];
    expect(passedSignal).toBeDefined();
    expect(passedSignal.aborted).toBe(false);
  });
});
