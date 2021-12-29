import axios from 'axios';
import { REACT_NATIVE_DRIVE_API_URL } from '@env';

import { IFile } from '../components/FileList';
import { getHeaders } from '../helpers/headers';

export async function getRecents(): Promise<IFile[]> {
  const headers = await getHeaders();
  const headersMap: Record<string, string> = {};

  headers.forEach((value: string, key: string) => {
    headersMap[key] = value;
  });

  const response = await axios.get(`${REACT_NATIVE_DRIVE_API_URL}/api/storage/recents`, {
    headers: headersMap,
  });

  return response.data;
}
