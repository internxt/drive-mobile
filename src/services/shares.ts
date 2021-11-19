import { IFile } from '../components/FileList';
import AesUtils from '../helpers/aesUtils';
import { getHeaders } from '../helpers/headers';

export interface IShare {
  token: string;
  file: string;
  encryptionKey: string;
  bucket: string;
  fileToken: string;
  isFolder: boolean;
  views: number;
  fileInfo: IFile;
}

async function decryptFileNames(shares: IShare[]) {
  shares.map((share) => {
    try {
      const decryptedName = AesUtils.decrypt(
        share.fileInfo.name,
        process.env.REACT_NATIVE_CRYPTO_SECRET2 + '-' + share.fileInfo.folderId,
      );

      share.fileInfo.name = decryptedName;
    } catch (err) {
      console.error('Error decrypting files: ', err);
    }
  });

  return shares;
}

export async function getShareList(): Promise<IShare[]> {
  return fetch(`${process.env.REACT_NATIVE_API_URL}/api/share/list`, {
    method: 'get',
    headers: await getHeaders(),
  })
    .then((res) => {
      if (res.status !== 200) {
        throw Error('Cannot load shares');
      }
      return res;
    })
    .then((res) => res.json())
    .then((results) => {
      decryptFileNames(results);
      return results;
    });
}
