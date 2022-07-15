import Axios from 'axios';
import { constants } from '../AppService';
import { PhotosCommonServices } from './PhotosCommonService';

export default class PhotosUsageService {
  public async getUsage(): Promise<number> {
    const response = await Axios.get<{ usage: number }>(`${constants.REACT_NATIVE_PHOTOS_API_URL}/photos/usage`, {
      headers: {
        Authorization: `Bearer ${PhotosCommonServices.model.accessToken}`,
      },
    });

    return response.data.usage;
  }
}
