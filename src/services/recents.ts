import { IFile } from '../components/FileList';
import { getHeaders } from '../helpers/headers';

export async function getRecents(limit?: number): Promise<IFile[]> {
  return fetch(`${process.env.REACT_NATIVE_API_URL}/api/storage/recents`, {
    method: 'get',
    headers: await getHeaders()
  }).then(res => {
    if (res.status !== 200) { throw Error('Cannot load recents') }
    return res;
  }).then(res => res.json()).then(res => { return res; })
}
