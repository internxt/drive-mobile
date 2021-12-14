import axios from 'axios';
import { IFile } from '../components/FileList';
import AesUtils from '../helpers/aesUtils';
import { getHeaders } from '../helpers/headers';

export interface IShare {
  token: string
  file: string
  encryptionKey: string
  bucket: string
  fileToken: string
  isFolder: boolean
  views: number
  fileInfo: IFile
}

async function decryptFileNames(shares: IShare[]) {
  shares.map(share => {
    try {
      const decryptedName = AesUtils.decrypt(share.fileInfo.name, process.env.REACT_NATIVE_CRYPTO_SECRET2 + '-' + share.fileInfo.folderId);

      share.fileInfo.name = decryptedName;
    } catch {
    }
  });

  return shares;
}

export async function getShareList(): Promise<IShare[]> {
  const headers = await getHeaders();
  const headersMap = {};

  headers.forEach((value, key) => {
    headersMap[key] = value;
  });

  const response = await axios.get(`${process.env.REACT_NATIVE_API_URL}/api/share/list`, {
    headers: headersMap
  })

  return decryptFileNames(response.data);
}
