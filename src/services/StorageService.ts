import prettysize from 'prettysize';
import { getHeaders } from '../helpers/headers';
import { constants } from './common/app/AppService';

export const FREE_STORAGE = 2147483648;

class StorageService {
  public toString(bytes: number) {
    return prettysize(bytes, true);
  }

  public async loadLimit(): Promise<number> {
    return fetch(`${constants.REACT_NATIVE_DRIVE_API_URL}/api/limit`, {
      method: 'get',
      headers: await getHeaders(),
    })
      .then((res) => {
        if (res.status !== 200) {
          throw Error('Cannot load limit');
        }
        return res;
      })
      .then((res) => res.json())
      .then((res) => {
        return res.maxSpaceBytes;
      });
  }
}

const storageService = new StorageService();
export default storageService;
