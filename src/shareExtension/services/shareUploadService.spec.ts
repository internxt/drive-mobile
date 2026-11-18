import * as RNFS from '@dr.pogodin/react-native-fs';
import { Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { uploadEncryptedFile } from './shareUploadService';

jest.mock('@dr.pogodin/react-native-fs', () => ({
  DocumentDirectoryPath: '/mock/document',
  stat: jest.fn(),
}));
jest.mock('./ShareSdkManager', () => ({ __esModule: true, default: {} }));
jest.mock('./shareEncryptionService', () => ({}));
jest.mock('./shareThumbnailService', () => ({}));

const HTTP_OK = 200;
const FILE_SIZE_BYTES = 1048576;
const UPLOAD_URL = 'https://storage.example.com/bucket/object';
const ENCRYPTED_FILE_PATH = '/mock/tmp/encrypted.bin';

const mockStat = RNFS.stat as jest.Mock;
const mockFetch = ReactNativeBlobUtil.fetch as jest.Mock;

const getSentHeaders = () => mockFetch.mock.calls[0][2];

beforeEach(() => {
  jest.clearAllMocks();
  mockStat.mockResolvedValue({ size: FILE_SIZE_BYTES });
  mockFetch.mockReturnValue(
    Promise.resolve({
      info: () => ({ status: HTTP_OK, timeout: false, headers: {} }),
      data: '',
    }),
  );
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('uploading an encrypted file', () => {
  test('when a file is uploaded on Android, then only the content type header is sent', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');

    await uploadEncryptedFile(UPLOAD_URL, ENCRYPTED_FILE_PATH);

    expect(getSentHeaders()).toStrictEqual({ 'Content-Type': 'application/octet-stream' });
  });

  test('when a file is uploaded on iOS, then the streaming headers with the file size are sent', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');

    await uploadEncryptedFile(UPLOAD_URL, ENCRYPTED_FILE_PATH);

    expect(getSentHeaders()).toStrictEqual({
      'Content-Type': 'application/octet-stream',
      'Transfer-Encoding': 'chunked',
      'Content-Length': String(FILE_SIZE_BYTES),
    });
  });
});
