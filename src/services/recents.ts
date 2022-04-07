import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';
import axios from 'axios';

import { getHeaders } from '../helpers/headers';
import { constants } from './app';

export async function getRecents(): Promise<DriveFileData[]> {
  const headers = await getHeaders();
  const headersMap: Record<string, string> = {};

  headers.forEach((value: string, key: string) => {
    headersMap[key] = value;
  });

  const response = await axios.get(`${constants.REACT_NATIVE_DRIVE_API_URL}/api/storage/recents`, {
    headers: headersMap,
  });

  return response.data;
}
