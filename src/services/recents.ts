import axios from 'axios';

import { IFile } from '../components/FileList';
import { getHeaders } from '../helpers/headers';

export async function getRecents(): Promise<IFile[]> {
  const headers = await getHeaders();
  const headersMap: Record<string, string> = {};

  headers.forEach((value: string, key: string) => {
    headersMap[key] = value;
  });

  const response = await axios.get(`${process.env.REACT_NATIVE_API_URL}/api/storage/recents`, {
    headers: headersMap,
  });

  return response.data;
}
