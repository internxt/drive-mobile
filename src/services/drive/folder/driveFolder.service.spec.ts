jest.mock('../../AppService', () => ({
  default: { constants: { DRIVE_NEW_API_URL: 'https://api.test.com' } },
  constants: { DRIVE_NEW_API_URL: 'https://api.test.com' },
}));
jest.mock('../../../helpers/headers', () => ({
  getHeaders: jest.fn().mockResolvedValue({ Authorization: 'Bearer photos-token' }),
}));
jest.mock('@internxt-mobile/services/AsyncStorageService', () => ({
  __esModule: true,
  default: { getItem: jest.fn() },
}));
jest.mock('@internxt-mobile/services/common', () => ({
  SdkManager: { getInstance: jest.fn().mockReturnValue({ storageV2: {} }) },
}));

global.fetch = jest.fn();

import asyncStorageService from '@internxt-mobile/services/AsyncStorageService';
import { driveFolderService } from './driveFolder.service';

const mockedGetItem = asyncStorageService.getItem as jest.Mock;
const mockedFetch = global.fetch as jest.Mock;

describe('fetching changed files inside a set of day folders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetItem.mockResolvedValue('photos-token');
  });

  test('when the server answers with a page, then the folders and the moment to look from are sent in the body', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ files: [{ uuid: 'file-1' }], nextCursor: 'next-page' }),
    });

    const page = await driveFolderService.getFolderDeltaChanges({
      folderUuids: ['day-1', 'day-2'],
      updatedAt: '2026-09-01T00:00:00.000Z',
      limit: 1000,
    });

    expect(page).toEqual({ files: [{ uuid: 'file-1', thumbnails: [] }], nextCursor: 'next-page' });

    const [url, options] = mockedFetch.mock.calls[0];
    expect(url).toBe('https://api.test.com/photos/folders/files/delta/search');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({
      folderUuids: ['day-1', 'day-2'],
      updatedAt: '2026-09-01T00:00:00.000Z',
      limit: 1000,
    });
  });

  test('when a cursor is given instead of a moment to look from, then the cursor travels in the body', async () => {
    mockedFetch.mockResolvedValue({ ok: true, json: async () => ({ files: [], nextCursor: null }) });

    await driveFolderService.getFolderDeltaChanges({ folderUuids: ['day-1'], cursor: 'opaque-cursor' });

    expect(JSON.parse(mockedFetch.mock.calls[0][1].body)).toEqual({
      folderUuids: ['day-1'],
      cursor: 'opaque-cursor',
    });
  });

  test('when the account has no photos token, then it fails instead of reporting no changes', async () => {
    mockedGetItem.mockResolvedValue(null);

    await expect(driveFolderService.getFolderDeltaChanges({ folderUuids: ['day-1'] })).rejects.toThrow(
      'no photos token available',
    );
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  test('when the server rejects the request, then the failure carries the status and the response body', async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'folderUuids must contain no more than 31 elements',
    });

    await expect(driveFolderService.getFolderDeltaChanges({ folderUuids: ['day-1'] })).rejects.toThrow(
      'HTTP 400 — folderUuids must contain no more than 31 elements',
    );
  });

  test('when the delta returns thumbnails in the endpoint own spelling, then they are handed back in the shape the app reads', async () => {
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        files: [
          {
            uuid: 'file-1',
            thumbnails: [
              {
                id: 1,
                fileId: 42,
                type: 'JPEG',
                size: 100,
                bucketId: 'bucket-1',
                bucketFile: 'bucket-file-1',
                encryptVersion: '03-aes',
                maxWidth: 384,
                maxHeight: 512,
                createdAt: '2026-09-01T00:00:00.000Z',
              },
            ],
          },
        ],
        nextCursor: null,
      }),
    } as never);

    const page = await driveFolderService.getFolderDeltaChanges({ folderUuids: ['day-1'], updatedAt: '2026-09-01T00:00:00.000Z' });

    expect(page.files[0].thumbnails[0]).toEqual({
      id: 1,
      file_id: 42,
      type: 'JPEG',
      size: 100,
      bucket_id: 'bucket-1',
      bucket_file: 'bucket-file-1',
      encrypt_version: '03-aes',
      max_width: 384,
      max_height: 512,
      createdAt: '2026-09-01T00:00:00.000Z',
    });
  });

  test('when the delta returns thumbnails already in the shared spelling, then they are left untouched', async () => {
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        files: [{ uuid: 'file-1', thumbnails: [{ id: 1, bucket_id: 'bucket-1', bucket_file: 'bucket-file-1' }] }],
        nextCursor: null,
      }),
    } as never);

    const page = await driveFolderService.getFolderDeltaChanges({ folderUuids: ['day-1'], updatedAt: '2026-09-01T00:00:00.000Z' });

    expect(page.files[0].thumbnails[0]).toEqual(
      expect.objectContaining({ bucket_id: 'bucket-1', bucket_file: 'bucket-file-1' }),
    );
  });

  test('when a delta file has no thumbnails, then it comes back with an empty list instead of failing', async () => {
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ files: [{ uuid: 'file-1' }], nextCursor: null }),
    } as never);

    const page = await driveFolderService.getFolderDeltaChanges({ folderUuids: ['day-1'], updatedAt: '2026-09-01T00:00:00.000Z' });

    expect(page.files[0].thumbnails).toEqual([]);
  });
});
