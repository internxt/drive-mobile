import Axios from 'axios';
import { PhotosServiceModel } from '../../types/photos';
import { constants } from '../app';

export default class PhotosUsageService {
  private readonly model: PhotosServiceModel;

  constructor(model: PhotosServiceModel) {
    this.model = model;
  }

  public async getUsage(): Promise<number> {
    const response = await Axios.get<{ usage: number }>(`${constants.REACT_NATIVE_PHOTOS_API_URL}/photos/usage`, {
      headers: {
        Authorization: `Bearer ${this.model.accessToken}`,
      },
    });

    return response.data.usage;
  }
}
