import prettysize from 'prettysize';
import { getHeaders } from '../helpers/headers';
import { constants } from './AppService';

export interface IProduct {
  id: string;
  name: string;
  metadata: {
    price_eur: string;
    simple_name: string;
    size_bytes: string;
    is_teams?: '1';
  };
  plans: IPlan[];
}
export interface IPlan {
  id: string;
  interval: string;
  interval_count: number;
  name: string;
  price: number;
}

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
